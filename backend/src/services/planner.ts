import { co2SavedGrams } from './co2.js';
import { DirectTripRow, GtfsDb, haversineMeters, StopRow } from './gtfsDb.js';

// Planejador de rotas (interface `RoutePlanner`), hoje com uma implementação "builtin" baseada no
// grafo de paradas/viagens do GTFS. Pensado para trocar por OpenTripPlanner (`PLANNER=otp`) sem
// mudar o restante do backend — ver `routes/routes.ts`, que decide qual implementação instanciar
// a partir de `config.planner`.
//
// Limitações conhecidas (documentadas aqui para não serem redescobertas como bug):
// - Não usa frequencies.txt: linhas que só têm horário por frequência (sem stop_times explícito)
//   não aparecem no planner ainda. Fica como próxima etapa (ver README).
// - Considera só o dia de hoje pelo relógio do servidor; não cruza fuso horário do dispositivo.
// - A baldeação usa a ordem "representativa" de paradas da rota (`stopsForRoute`), que assume que
//   todas as viagens de uma mesma rota+sentido passam pelas mesmas paradas na mesma ordem — verdade
//   na grande maioria dos casos, mas pode falhar em viagens "encurtadas" (GTFS trip_short_name variants).

export type LatLng = { lat: number; lng: number };

export type PlanRequest = {
  origin: LatLng;
  destination: LatLng;
  departAt?: string; // ISO; padrão = agora
  arriveBy?: string; // ISO; quando presente, é só informativo na resposta (ver limitação acima)
  onlyAccessible?: boolean;
  lessWalking?: boolean;
};

// Inclui lat/lng (não só id/código): o alerta de descida do app compara o GPS do celular direto
// com a coordenada da parada de desembarque, sem precisar de outra chamada à API.
export type StopRef = { id: string; code: string | null; name: string; lat: number; lng: number };

export type WalkLeg = { type: 'walk'; from: string; to: string; meters: number; minutes: number };
export type BusLeg = {
  type: 'bus';
  line: string;
  destination: string;
  fromStop: StopRef;
  toStop: StopRef;
  departAt: string;
  arriveAt: string;
  minutes: number;
  accessible: boolean | null;
  confidence: 'live' | 'scheduled';
};
export type RouteLeg = WalkLeg | BusLeg;

export type RouteOption = {
  legs: RouteLeg[];
  departAt: string;
  arriveAt: string;
  totalMinutes: number;
  walkMeters: number;
  transfers: number;
  confidence: 'live' | 'scheduled';
  accessible: boolean | null;
  co2SavedGrams: number;
};

export interface RoutePlanner {
  plan(req: PlanRequest): Promise<RouteOption[]>;
}

// Hook opcional para enriquecer uma perna de ônibus com dado ao vivo da Olho Vivo. Mantido fora
// do algoritmo em si (que não deveria depender de rede) — ver `routes/routes.ts` para a implementação
// que usa os serviços reais; os testes do planner não passam nenhum provider (fica 100% "programado").
export type LiveLookup = (routeId: string, originStopCode: string | null, destStopCode: string | null) => Promise<LiveMatch | null>;
export type LiveMatch = { departAt: string; arriveAt: string; accessible: boolean | null };

const WALK_SPEED_M_PER_MIN = 4800 / 60; // 4,8 km/h
const MAX_WALK_METERS = 800;
const MAX_TRANSFER_WALK_METERS = 300;
const MAX_CANDIDATE_STOPS = 6;
const MAX_CANDIDATE_ROUTES_PER_SIDE = 4;
const MAX_OPTIONS = 5;
const MAX_RESPONSE_MS = 3000;

function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_SPEED_M_PER_MIN));
}

function toStopRef(stop: StopRow): StopRef {
  return { id: stop.stop_id, code: stop.stop_code, name: stop.stop_name, lat: stop.stop_lat, lng: stop.stop_lon };
}

// "HH:MM:SS" do GTFS (pode passar de 24:00:00) -> minutos desde a meia-noite do dia de serviço.
function gtfsTimeToMinutes(time: string): number {
  const [h, m, s = '0'] = time.split(':');
  return Number(h) * 60 + Number(m) + Number(s) / 60;
}

function minutesToIso(baseMidnight: Date, minutes: number): string {
  return new Date(baseMidnight.getTime() + minutes * 60_000).toISOString();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const WEEKDAY_COLUMNS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

// Serviços (service_id) ativos na data informada, lendo a tabela `calendar`. Se a tabela estiver
// vazia (feed sem calendar.txt importado), não filtra nada — é melhor mostrar de mais do que de menos.
function activeServiceIds(gtfsDb: GtfsDb, date: Date): Set<string> | null {
  const rows = gtfsDb.db.prepare('SELECT * FROM calendar').all() as Record<string, string | number>[];
  if (rows.length === 0) return null;

  const weekdayColumn = WEEKDAY_COLUMNS[date.getDay()];
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

  const active = new Set<string>();
  for (const row of rows) {
    const withinRange = String(row.start_date) <= dateStr && dateStr <= String(row.end_date);
    if (withinRange && Number(row[weekdayColumn]) === 1) active.add(String(row.service_id));
  }
  return active;
}

function isTripServiceActive(gtfsDb: GtfsDb, tripId: string, active: Set<string> | null): boolean {
  if (active === null) return true;
  const trip = gtfsDb.db.prepare('SELECT service_id FROM trips WHERE trip_id = ?').get(tripId) as { service_id: string } | undefined;
  return Boolean(trip && active.has(trip.service_id));
}

type DirectCandidate = {
  row: DirectTripRow;
  originDepartureMinutes: number;
  destArrivalMinutes: number;
};

// Entre várias instâncias (horários) da mesma rota+sentido+par de paradas, fica só com a próxima
// a partir do horário desejado — sem isso, a mesma linha apareceria 1x por horário do dia inteiro.
function nextDepartureByRouteDirection(rows: DirectTripRow[], requestedMinutes: number): DirectCandidate[] {
  const best = new Map<string, DirectCandidate>();
  for (const row of rows) {
    if (!row.origin_departure || !row.dest_arrival) continue;
    const originDepartureMinutes = gtfsTimeToMinutes(row.origin_departure);
    if (originDepartureMinutes < requestedMinutes) continue; // já passou
    const destArrivalMinutes = gtfsTimeToMinutes(row.dest_arrival);

    const key = `${row.route_id}|${row.direction_id}|${row.origin_stop_id}|${row.dest_stop_id}`;
    const existing = best.get(key);
    if (!existing || originDepartureMinutes < existing.originDepartureMinutes) {
      best.set(key, { row, originDepartureMinutes, destArrivalMinutes });
    }
  }
  return [...best.values()];
}

export function createBuiltinPlanner(gtfsDb: GtfsDb, liveLookup?: LiveLookup): RoutePlanner {
  async function buildBusLeg(
    routeId: string,
    fromStop: StopRow,
    toStop: StopRow,
    originDepartureMinutes: number,
    destArrivalMinutes: number,
    baseMidnight: Date,
  ): Promise<BusLeg> {
    const route = gtfsDb.findRouteById(routeId);
    const scheduledDepart = minutesToIso(baseMidnight, originDepartureMinutes);
    const scheduledArrive = minutesToIso(baseMidnight, destArrivalMinutes);

    const live = liveLookup ? await liveLookup(routeId, fromStop.stop_code, toStop.stop_code).catch(() => null) : null;

    return {
      type: 'bus',
      line: route?.route_short_name ?? routeId,
      destination: route?.route_long_name ?? '',
      fromStop: toStopRef(fromStop),
      toStop: toStopRef(toStop),
      departAt: live?.departAt ?? scheduledDepart,
      arriveAt: live?.arriveAt ?? scheduledArrive,
      minutes: Math.max(1, Math.round((new Date(live?.arriveAt ?? scheduledArrive).getTime() - new Date(live?.departAt ?? scheduledDepart).getTime()) / 60_000)),
      accessible: live?.accessible ?? null,
      confidence: live ? 'live' : 'scheduled',
    };
  }

  async function findDirectOptions(
    originStops: (StopRow & { distance_m: number })[],
    destStops: (StopRow & { distance_m: number })[],
    requestedAt: Date,
    activeServices: Set<string> | null,
  ): Promise<RouteOption[]> {
    const rows = gtfsDb.findDirectTrips(originStops.map((s) => s.stop_id), destStops.map((s) => s.stop_id));
    const requestedMinutes = (requestedAt.getTime() - startOfDay(requestedAt).getTime()) / 60_000;
    const candidates = nextDepartureByRouteDirection(rows, requestedMinutes).filter((c) => isTripServiceActive(gtfsDb, c.row.trip_id, activeServices));

    const baseMidnight = startOfDay(requestedAt);
    const options: RouteOption[] = [];

    for (const candidate of candidates) {
      const originStop = originStops.find((s) => s.stop_id === candidate.row.origin_stop_id);
      const destStop = destStops.find((s) => s.stop_id === candidate.row.dest_stop_id);
      if (!originStop || !destStop) continue;

      const walkToOriginMinutes = walkMinutes(originStop.distance_m);
      const walkFromDestMinutes = walkMinutes(destStop.distance_m);
      const busLeg = await buildBusLeg(candidate.row.route_id, originStop, destStop, candidate.originDepartureMinutes, candidate.destArrivalMinutes, baseMidnight);

      const departAt = new Date(new Date(busLeg.departAt).getTime() - walkToOriginMinutes * 60_000).toISOString();
      const arriveAt = new Date(new Date(busLeg.arriveAt).getTime() + walkFromDestMinutes * 60_000).toISOString();
      const totalMinutes = Math.round((new Date(arriveAt).getTime() - new Date(departAt).getTime()) / 60_000);
      const walkMeters = Math.round(originStop.distance_m + destStop.distance_m);
      const rideKm = haversineMeters(originStop.stop_lat, originStop.stop_lon, destStop.stop_lat, destStop.stop_lon) / 1000;

      options.push({
        legs: [
          { type: 'walk', from: 'origin', to: originStop.stop_name, meters: Math.round(originStop.distance_m), minutes: walkToOriginMinutes },
          busLeg,
          { type: 'walk', from: destStop.stop_name, to: 'destination', meters: Math.round(destStop.distance_m), minutes: walkFromDestMinutes },
        ],
        departAt,
        arriveAt,
        totalMinutes,
        walkMeters,
        transfers: 0,
        confidence: busLeg.confidence,
        accessible: busLeg.accessible,
        co2SavedGrams: co2SavedGrams(rideKm),
      });
    }
    return options;
  }

  async function findTransferOptions(
    originStops: (StopRow & { distance_m: number })[],
    destStops: (StopRow & { distance_m: number })[],
    requestedAt: Date,
    activeServices: Set<string> | null,
  ): Promise<RouteOption[]> {
    const originStopIds = originStops.map((s) => s.stop_id);
    const destStopIds = destStops.map((s) => s.stop_id);

    const routesFromOrigin = distinctRouteDirections(gtfsDb.tripStopsAt(originStopIds)).slice(0, MAX_CANDIDATE_ROUTES_PER_SIDE);
    const routesToDest = distinctRouteDirections(gtfsDb.tripStopsAt(destStopIds)).slice(0, MAX_CANDIDATE_ROUTES_PER_SIDE);

    const requestedMinutes = (requestedAt.getTime() - startOfDay(requestedAt).getTime()) / 60_000;
    const baseMidnight = startOfDay(requestedAt);
    const options: RouteOption[] = [];

    for (const a of routesFromOrigin) {
      const stopsA = gtfsDb.stopsForRoute(a.route_id, a.direction_id);
      const originOnA = stopsA.find((s) => originStopIds.includes(s.stop_id));
      if (!originOnA) continue;

      for (const b of routesToDest) {
        if (a.route_id === b.route_id && a.direction_id === b.direction_id) continue;
        const stopsB = gtfsDb.stopsForRoute(b.route_id, b.direction_id);
        const destOnB = stopsB.find((s) => destStopIds.includes(s.stop_id));
        if (!destOnB) continue;

        // Procura um par de paradas (T na rota A, depois do embarque; T' na rota B, antes do
        // desembarque) a até 300 m uma da outra — a baldeação em si.
        let best: { t: StopRow & { stop_sequence: number }; tPrime: StopRow & { stop_sequence: number }; walk: number } | null = null;
        for (const t of stopsA) {
          if (t.stop_sequence <= originOnA.stop_sequence) continue;
          for (const tPrime of stopsB) {
            if (tPrime.stop_sequence >= destOnB.stop_sequence) continue;
            const walk = haversineMeters(t.stop_lat, t.stop_lon, tPrime.stop_lat, tPrime.stop_lon);
            if (walk <= MAX_TRANSFER_WALK_METERS && (!best || walk < best.walk)) best = { t, tPrime, walk };
          }
        }
        if (!best) continue;

        const originStop = originStops.find((s) => s.stop_id === originOnA.stop_id);
        const destStop = destStops.find((s) => s.stop_id === destOnB.stop_id);
        if (!originStop || !destStop) continue;

        // Horário: próxima partida da rota A na parada de origem; a chegada na parada de baldeação
        // vem do horário real dessa MESMA viagem em `best.t` (não uma estimativa) — como as viagens
        // de uma rota+sentido têm GTFS trip_id únicos por horário, basta reconsultar `stop_times`
        // para o trip escolhido.
        const legARows = gtfsDb.tripStopsAt([originOnA.stop_id]).filter((r) => r.route_id === a.route_id && r.direction_id === a.direction_id);
        const legANext = legARows
          .filter((r) => isTripServiceActive(gtfsDb, r.trip_id, activeServices))
          .map((r) => ({ r, minutes: r.departure_time ? gtfsTimeToMinutes(r.departure_time) : Infinity }))
          .filter((x) => x.minutes >= requestedMinutes)
          .sort((x, y) => x.minutes - y.minutes)[0];
        if (!legANext) continue;

        const transferArrivalRow = gtfsDb.stopTimeOnTrip(legANext.r.trip_id, best.t.stop_id);
        if (!transferArrivalRow?.arrival_time) continue;
        const estimatedArrivalAtTransfer = gtfsTimeToMinutes(transferArrivalRow.arrival_time);
        const walkAtTransferMinutes = walkMinutes(best.walk);

        const legBRows = gtfsDb
          .tripStopsAt([destOnB.stop_id])
          .filter((r) => r.route_id === b.route_id && r.direction_id === b.direction_id && isTripServiceActive(gtfsDb, r.trip_id, activeServices));
        // Precisa também da partida da rota B na parada de baldeação (tPrime) pra calcular o tempo de viagem do segundo trecho.
        const legBAtTransfer = gtfsDb
          .tripStopsAt([best.tPrime.stop_id])
          .filter((r) => r.route_id === b.route_id && r.direction_id === b.direction_id);

        const legBNext = legBAtTransfer
          .map((r) => ({ r, minutes: r.departure_time ? gtfsTimeToMinutes(r.departure_time) : Infinity }))
          .filter((x) => x.minutes >= estimatedArrivalAtTransfer + walkAtTransferMinutes)
          .sort((x, y) => x.minutes - y.minutes)[0];
        if (!legBNext) continue;

        const matchingTripArrival = legBRows.find((r) => r.trip_id === legBNext.r.trip_id);
        if (!matchingTripArrival?.arrival_time) continue;
        const destArrivalMinutes = gtfsTimeToMinutes(matchingTripArrival.arrival_time);

        const walkToOriginMinutes = walkMinutes(originStop.distance_m);
        const walkFromDestMinutes = walkMinutes(destStop.distance_m);

        const busLegA = await buildBusLeg(a.route_id, originStop, best.t, legANext.minutes, estimatedArrivalAtTransfer, baseMidnight);
        const busLegB = await buildBusLeg(b.route_id, best.tPrime, destStop, legBNext.minutes, destArrivalMinutes, baseMidnight);

        const departAt = new Date(new Date(busLegA.departAt).getTime() - walkToOriginMinutes * 60_000).toISOString();
        const arriveAt = new Date(new Date(busLegB.arriveAt).getTime() + walkFromDestMinutes * 60_000).toISOString();
        const totalMinutes = Math.round((new Date(arriveAt).getTime() - new Date(departAt).getTime()) / 60_000);
        const walkMeters = Math.round(originStop.distance_m + best.walk + destStop.distance_m);
        const rideKm =
          haversineMeters(originStop.stop_lat, originStop.stop_lon, best.t.stop_lat, best.t.stop_lon) / 1000 +
          haversineMeters(best.tPrime.stop_lat, best.tPrime.stop_lon, destStop.stop_lat, destStop.stop_lon) / 1000;

        options.push({
          legs: [
            { type: 'walk', from: 'origin', to: originStop.stop_name, meters: Math.round(originStop.distance_m), minutes: walkToOriginMinutes },
            busLegA,
            { type: 'walk', from: best.t.stop_name, to: best.tPrime.stop_name, meters: Math.round(best.walk), minutes: walkAtTransferMinutes },
            busLegB,
            { type: 'walk', from: destStop.stop_name, to: 'destination', meters: Math.round(destStop.distance_m), minutes: walkFromDestMinutes },
          ],
          departAt,
          arriveAt,
          totalMinutes,
          walkMeters,
          transfers: 1,
          confidence: busLegA.confidence === 'live' && busLegB.confidence === 'live' ? 'live' : 'scheduled',
          accessible: busLegA.accessible === false || busLegB.accessible === false ? false : busLegA.accessible && busLegB.accessible,
          co2SavedGrams: co2SavedGrams(rideKm),
        });
      }
    }
    return options;
  }

  return {
    async plan(req: PlanRequest): Promise<RouteOption[]> {
      const startedAt = Date.now();
      const requestedAt = req.departAt ? new Date(req.departAt) : new Date();
      const activeServices = activeServiceIds(gtfsDb, requestedAt);

      const originStops = gtfsDb.nearbyStops(req.origin.lat, req.origin.lng, MAX_WALK_METERS, MAX_CANDIDATE_STOPS);
      const destStops = gtfsDb.nearbyStops(req.destination.lat, req.destination.lng, MAX_WALK_METERS, MAX_CANDIDATE_STOPS);
      if (originStops.length === 0 || destStops.length === 0) return [];

      const direct = await findDirectOptions(originStops, destStops, requestedAt, activeServices);

      let withTransfer: RouteOption[] = [];
      if (Date.now() - startedAt < MAX_RESPONSE_MS) {
        withTransfer = await findTransferOptions(originStops, destStops, requestedAt, activeServices);
      }

      let all = [...direct, ...withTransfer];
      if (req.onlyAccessible) all = all.filter((o) => o.accessible !== false);
      if (req.lessWalking) all = all.sort((a, b) => a.walkMeters - b.walkMeters || a.totalMinutes - b.totalMinutes);
      else all = all.sort((a, b) => new Date(a.arriveAt).getTime() - new Date(b.arriveAt).getTime());

      return all.slice(0, MAX_OPTIONS);
    },
  };
}

function distinctRouteDirections<T extends { route_id: string; direction_id: number | null }>(rows: T[]): { route_id: string; direction_id: number }[] {
  const seen = new Map<string, { route_id: string; direction_id: number }>();
  for (const r of rows) {
    if (r.direction_id === null) continue;
    const key = `${r.route_id}|${r.direction_id}`;
    if (!seen.has(key)) seen.set(key, { route_id: r.route_id, direction_id: r.direction_id });
  }
  return [...seen.values()];
}
