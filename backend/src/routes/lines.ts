import { Router } from 'express';

import { cached, TTL } from '../services/cache.js';
import { recordSnapshot } from '../services/collector.js';
import { findRouteByShortName, scheduleForRoute, searchRoutes, shapeForRoute, stopsForRoute } from '../services/gtfsDb.js';
import * as olhoVivo from '../services/olhoVivo.js';
import { ageSeconds } from '../services/time.js';
import { BadRequest } from '../validation.js';

export const linesRouter = Router();

// A busca junta as duas fontes de identificador de linha que o resto da API usa:
// - `vehiclesCode`: código numérico da Olho Vivo (`cl`), usado só em GET /:code/vehicles.
// - `routeId`: route_id do GTFS, usado em GET /:code/stops e GET /:code/shape.
// O app guarda os dois a partir desta resposta (nunca precisa adivinhar qual usar onde).
linesRouter.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) throw new BadRequest('Informe o parâmetro "q".');

  const gtfsMatches = searchRoutes(q, 20);
  let liveMatches: Awaited<ReturnType<typeof olhoVivo.searchLines>> = [];
  if (olhoVivo.olhoVivoConfigured()) {
    try {
      liveMatches = await olhoVivo.searchLines(q);
    } catch {
      liveMatches = [];
    }
  }

  const results = gtfsMatches.map((route) => {
    const live = liveMatches.find((l) => String(l.tl) === route.route_short_name);
    return {
      routeId: route.route_id,
      vehiclesCode: live?.cl ?? null,
      shortName: route.route_short_name,
      longName: route.route_long_name,
      direction: live?.sl ?? null,
      destination: live?.tp ?? null,
      origin: live?.ts ?? null,
    };
  });

  res.json(results);
});

linesRouter.get('/:code/vehicles', async (req, res) => {
  const lineCode = Number(req.params.code);
  if (Number.isNaN(lineCode)) throw new BadRequest('Código de linha inválido.');
  if (!olhoVivo.olhoVivoConfigured()) {
    res.json({ capturedAt: null, vehicles: [], stale: false });
    return;
  }

  try {
    const { value: positions, stale } = await cached(`vehicles:${lineCode}`, TTL.positions, () =>
      olhoVivo.vehiclePositionsForLine(lineCode),
    );
    recordSnapshot('position', { lineCode: String(lineCode), capturedAt: positions.hr, payload: positions });
    res.json({
      capturedAt: positions.hr,
      stale,
      vehicles: positions.vs.map((v) => ({
        prefix: v.p,
        lat: v.py,
        lng: v.px,
        accessible: v.a,
        ageSeconds: ageSeconds(v.ta),
      })),
    });
  } catch {
    res.json({ capturedAt: null, vehicles: [], stale: false });
  }
});

const directionOf = (req: { query: { direction?: unknown } }) => (req.query.direction === '1' ? 1 : 0);

linesRouter.get('/:code/stops', (req, res) => {
  res.json(stopsForRoute(req.params.code, directionOf(req)));
});

linesRouter.get('/:code/shape', (req, res) => {
  res.json(shapeForRoute(req.params.code, directionOf(req)));
});

linesRouter.get('/:code/schedule', (req, res) => {
  res.json(scheduleForRoute(req.params.code, directionOf(req)));
});

// Util pra outras rotas (ex.: planner) resolverem "8000-10" -> route_id do GTFS sem repetir busca.
export function routeIdForShortName(shortName: string) {
  return findRouteByShortName(shortName)?.route_id;
}
