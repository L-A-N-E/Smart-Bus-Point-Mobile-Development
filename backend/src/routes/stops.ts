import { Router } from 'express';
import { z } from 'zod';

import { cached, TTL } from '../services/cache.js';
import { recordSnapshot } from '../services/collector.js';
import { findStopByCode, nearbyStops, scheduledTimesForStop, searchStops, db } from '../services/gtfsDb.js';
import * as olhoVivo from '../services/olhoVivo.js';
import { ageSeconds, confidenceFromAge, minutesUntil } from '../services/time.js';
import { BadRequest } from '../validation.js';

export const stopsRouter = Router();

export type Arrival = {
  line: string;
  destination: string;
  minutes: number;
  predictedTime: string;
  accessible: boolean | null;
  confidence: 'live' | 'scheduled';
  dataAgeSeconds: number | null;
};

const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(50).max(5000).default(600),
});

// Código de parada da SPTrans: inteiro positivo curto. Valida antes de usar como chave de cache
// ou de repassar pra Olho Vivo — sem isso, qualquer string vira uma entrada nova no cache em
// memória (sem limite de tamanho), um jeito barato de esgotar memória do processo.
const stopCode = z.coerce.number().int().positive().max(999_999_999);

function parseStopCode(raw: string): string | null {
  const parsed = stopCode.safeParse(raw);
  return parsed.success ? String(parsed.data) : null;
}

stopsRouter.get('/nearby', (req, res) => {
  const parsed = nearbyQuery.safeParse(req.query);
  if (!parsed.success) throw new BadRequest(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos.');
  const { lat, lng, radius } = parsed.data;
  res.json(nearbyStops(lat, lng, radius));
});

stopsRouter.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) throw new BadRequest('Informe o parâmetro "q".');
  res.json(searchStops(q));
});

stopsRouter.get('/:code', (req, res) => {
  const code = parseStopCode(req.params.code);
  if (!code) throw new BadRequest('Código de parada inválido.');

  const stop = findStopByCode(code);
  if (!stop) {
    res.status(404).json({ error: 'Parada não encontrada.' });
    return;
  }
  res.json(stop);
});

stopsRouter.get('/:code/arrivals', async (req, res) => {
  const code = parseStopCode(req.params.code);
  if (!code) throw new BadRequest('Código de parada inválido.');

  const onlyAccessible = req.query.onlyAccessible === 'true';
  const stop = findStopByCode(code);

  const liveArrivals = await fetchLiveArrivals(code);
  let arrivals = liveArrivals.value;

  if (arrivals.length === 0) {
    arrivals = stop ? scheduledArrivalsForStop(stop.stop_id) : [];
  }

  if (onlyAccessible) {
    arrivals = arrivals.filter((a) => a.accessible !== false);
  }

  res.json({
    stop: stop ?? null,
    arrivals: arrivals.sort((a, b) => a.minutes - b.minutes),
    stale: liveArrivals.stale,
  });
});

async function fetchLiveArrivals(code: string): Promise<{ value: Arrival[]; stale: boolean }> {
  if (!olhoVivo.olhoVivoConfigured()) return { value: [], stale: false };

  try {
    const { value: prediction, stale } = await cached(`arrivals:${code}`, TTL.predictions, () =>
      olhoVivo.predictionsForStop(Number(code)),
    );
    recordSnapshot('prediction', { stopCode: code, capturedAt: prediction.hr, payload: prediction });

    const arrivals: Arrival[] = [];
    for (const line of prediction.p?.l ?? []) {
      for (const vehicle of line.vs) {
        const age = ageSeconds(vehicle.ta);
        arrivals.push({
          line: line.lt0 || String(line.c),
          destination: line.lt0,
          minutes: minutesUntil(vehicle.t),
          predictedTime: vehicle.t,
          accessible: vehicle.a,
          confidence: confidenceFromAge(age),
          dataAgeSeconds: age,
        });
      }
    }
    return { value: arrivals, stale };
  } catch {
    return { value: [], stale: false };
  }
}

function scheduledArrivalsForStop(stopId: string): Arrival[] {
  const rows = scheduledTimesForStop(stopId, 40);
  return rows
    .filter((r) => r.departure_time)
    .map((r) => {
      const trip = db
        .prepare(
          `SELECT t.trip_headsign, r.route_short_name FROM trips t
           JOIN routes r ON r.route_id = t.route_id
           WHERE t.trip_id = ?`,
        )
        .get(r.trip_id) as { trip_headsign: string | null; route_short_name: string | null } | undefined;

      return {
        line: trip?.route_short_name ?? '?',
        destination: trip?.trip_headsign ?? '',
        minutes: minutesUntil(r.departure_time as string),
        predictedTime: (r.departure_time as string).slice(0, 5),
        accessible: null,
        confidence: 'scheduled' as const,
        dataAgeSeconds: null,
      };
    })
    .filter((a) => a.minutes >= -2 && a.minutes <= 90);
}
