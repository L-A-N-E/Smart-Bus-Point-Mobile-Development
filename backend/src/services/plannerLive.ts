import { cached, TTL } from './cache.js';
import { GtfsDb } from './gtfsDb.js';
import * as olhoVivo from './olhoVivo.js';
import { LiveLookup, LiveMatch } from './planner.js';
import { ageSeconds, confidenceFromAge } from './time.js';

// Liga o planner (que não deveria depender de rede) à Olho Vivo: dado um route_id do GTFS e os
// códigos de parada de origem/destino, tenta achar a previsão ao vivo real pra essa combinação.
// Builds só devolvem "scheduled" quando isso falha (token ausente, linha não casada, sem veículo
// localizado) — nunca lança erro pro planner, que trataria como falha de rota inteira.
export function createOlhoVivoLiveLookup(gtfsDb: GtfsDb): LiveLookup {
  async function resolveVehiclesCode(shortName: string): Promise<number | null> {
    if (!shortName) return null;
    const { value } = await cached(`planner-line-code:${shortName}`, TTL.geocoding, async () => {
      const matches = await olhoVivo.searchLines(shortName);
      return matches.find((m) => String(m.tl) === shortName)?.cl ?? null;
    });
    return value;
  }

  return async function liveLookup(routeId, originStopCode, destStopCode): Promise<LiveMatch | null> {
    if (!olhoVivo.olhoVivoConfigured() || !originStopCode || !destStopCode) return null;
    const route = gtfsDb.findRouteById(routeId);
    if (!route?.route_short_name) return null;

    const lineCode = await resolveVehiclesCode(route.route_short_name);
    if (lineCode === null) return null;

    try {
      const [atOrigin, atDest] = await Promise.all([
        cached(`planner-live:${lineCode}:${originStopCode}`, TTL.predictions, () => olhoVivo.predictionsForStopAndLine(Number(originStopCode), lineCode)),
        cached(`planner-live:${lineCode}:${destStopCode}`, TTL.predictions, () => olhoVivo.predictionsForStopAndLine(Number(destStopCode), lineCode)),
      ]);

      const originVehicle = atOrigin.value.p?.l?.[0]?.vs?.[0];
      const destVehicle = atDest.value.p?.l?.[0]?.vs?.[0];
      if (!originVehicle || !destVehicle) return null;

      const originAge = ageSeconds(originVehicle.ta);
      if (confidenceFromAge(originAge) !== 'live') return null;

      const now = new Date();
      const departAt = parseClockToday(originVehicle.t, now);
      const arriveAt = parseClockToday(destVehicle.t, now);
      return { departAt, arriveAt, accessible: originVehicle.a };
    } catch {
      return null;
    }
  };
}

function parseClockToday(hhmm: string, now: Date): string {
  const [h, m] = hhmm.split(':').map(Number);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (date.getTime() < now.getTime() - 60 * 60 * 1000) date.setDate(date.getDate() + 1);
  return date.toISOString();
}
