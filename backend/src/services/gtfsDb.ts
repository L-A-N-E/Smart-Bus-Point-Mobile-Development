import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Banco gerado por `npm run gtfs:import` a partir do zip em `data/gtfs/` (gitignored).
// Guarda só o que o app precisa consultar: paradas, linhas, viagens, horários e traçado.
//
// A conexão e as consultas vivem numa factory (`createGtfsDb`) em vez de um módulo com estado
// global, para que o planner e os testes possam abrir um banco próprio (ex.: em memória, com
// fixtures) em vez de sempre bater no arquivo real de `data/gtfs.db`.

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS stops (
    stop_id TEXT PRIMARY KEY,
    stop_code TEXT,
    stop_name TEXT NOT NULL,
    stop_lat REAL NOT NULL,
    stop_lon REAL NOT NULL,
    wheelchair_boarding INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_stops_lat ON stops (stop_lat);
  CREATE INDEX IF NOT EXISTS idx_stops_lon ON stops (stop_lon);
  CREATE INDEX IF NOT EXISTS idx_stops_code ON stops (stop_code);

  CREATE TABLE IF NOT EXISTS routes (
    route_id TEXT PRIMARY KEY,
    route_short_name TEXT,
    route_long_name TEXT,
    route_type INTEGER,
    route_color TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_routes_short_name ON routes (route_short_name);

  CREATE TABLE IF NOT EXISTS trips (
    trip_id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    trip_headsign TEXT,
    direction_id INTEGER,
    shape_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_trips_route ON trips (route_id, direction_id);

  CREATE TABLE IF NOT EXISTS stop_times (
    trip_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    arrival_time TEXT,
    departure_time TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON stop_times (stop_id);
  CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON stop_times (trip_id, stop_sequence);

  CREATE TABLE IF NOT EXISTS shapes (
    shape_id TEXT NOT NULL,
    shape_pt_lat REAL NOT NULL,
    shape_pt_lon REAL NOT NULL,
    shape_pt_sequence INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_shapes_id ON shapes (shape_id, shape_pt_sequence);

  CREATE TABLE IF NOT EXISTS calendar (
    service_id TEXT PRIMARY KEY,
    monday INTEGER, tuesday INTEGER, wednesday INTEGER, thursday INTEGER,
    friday INTEGER, saturday INTEGER, sunday INTEGER,
    start_date TEXT, end_date TEXT
  );

  CREATE TABLE IF NOT EXISTS frequencies (
    trip_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    headway_secs INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_frequencies_trip ON frequencies (trip_id);

  -- Mapeamento codigoParada (Olho Vivo) <-> stop_id (GTFS), só para os casos em que eles
  -- não coincidem (ver nota no README sobre a verificação pendente dessa correspondência).
  CREATE TABLE IF NOT EXISTS stop_code_overrides (
    olho_vivo_code TEXT PRIMARY KEY,
    gtfs_stop_id TEXT NOT NULL
  );
`;

export type StopRow = {
  stop_id: string;
  stop_code: string | null;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  wheelchair_boarding: number | null;
};

export type RouteRow = {
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
  route_type: number | null;
  route_color: string | null;
};

export type StopTimeRow = {
  trip_id: string;
  stop_id: string;
  stop_sequence: number;
  arrival_time: string | null;
  departure_time: string | null;
};

export type ShapePoint = { shape_pt_lat: number; shape_pt_lon: number; shape_pt_sequence: number };

// Linha de uma junção stop_times x stop_times no MESMO trip_id — candidata a trecho direto
// de ônibus (ver services/planner.ts).
export type DirectTripRow = {
  trip_id: string;
  route_id: string;
  direction_id: number | null;
  origin_stop_id: string;
  origin_seq: number;
  origin_departure: string | null;
  dest_stop_id: string;
  dest_seq: number;
  dest_arrival: string | null;
};

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type GtfsDb = ReturnType<typeof createGtfsDb>;

export function createGtfsDb(filename: string) {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.function('distance_m', (lat1: number, lon1: number, lat2: number, lon2: number) => haversineMeters(lat1, lon1, lat2, lon2));

  function createSchema() {
    db.exec(SCHEMA_SQL);
  }

  function gtfsIsImported(): boolean {
    const row = db.prepare('SELECT COUNT(*) as count FROM stops').get() as { count: number } | undefined;
    return Boolean(row && row.count > 0);
  }

  function findStopByCode(code: string): StopRow | undefined {
    // Primeiro tenta o mapeamento manual (quando codigoParada da Olho Vivo != stop_id do GTFS),
    // depois por stop_code (o campo GTFS pensado para o código físico da parada) e por fim stop_id.
    const override = db.prepare('SELECT gtfs_stop_id FROM stop_code_overrides WHERE olho_vivo_code = ?').get(code) as
      | { gtfs_stop_id: string }
      | undefined;
    const id = override?.gtfs_stop_id ?? code;
    return (
      (db.prepare('SELECT * FROM stops WHERE stop_code = ?').get(id) as StopRow | undefined) ??
      (db.prepare('SELECT * FROM stops WHERE stop_id = ?').get(id) as StopRow | undefined)
    );
  }

  function findStopById(stopId: string): StopRow | undefined {
    return db.prepare('SELECT * FROM stops WHERE stop_id = ?').get(stopId) as StopRow | undefined;
  }

  function searchStops(query: string, limit = 20): StopRow[] {
    return db.prepare('SELECT * FROM stops WHERE stop_name LIKE ? OR stop_code LIKE ? LIMIT ?').all(`%${query}%`, `%${query}%`, limit) as StopRow[];
  }

  function nearbyStops(lat: number, lon: number, radiusMeters: number, limit = 40): (StopRow & { distance_m: number })[] {
    // Filtra primeiro por uma caixa (graus) bem maior que o raio pra usar os índices de lat/lon,
    // e só então calcula a distância exata (Haversine) pra ordenar e aplicar o raio de verdade.
    const degreePad = radiusMeters / 111_000 + 0.01;
    return db
      .prepare(
        `SELECT * FROM (
           SELECT *, distance_m(stop_lat, stop_lon, ?, ?) as distance_m FROM stops
           WHERE stop_lat BETWEEN ? AND ? AND stop_lon BETWEEN ? AND ?
         )
         WHERE distance_m <= ?
         ORDER BY distance_m ASC
         LIMIT ?`,
      )
      .all(lat, lon, lat - degreePad, lat + degreePad, lon - degreePad, lon + degreePad, radiusMeters, limit) as (StopRow & {
      distance_m: number;
    })[];
  }

  function searchRoutes(query: string, limit = 20): RouteRow[] {
    return db.prepare('SELECT * FROM routes WHERE route_short_name LIKE ? OR route_long_name LIKE ? LIMIT ?').all(`%${query}%`, `%${query}%`, limit) as RouteRow[];
  }

  function findRouteByShortName(shortName: string): RouteRow | undefined {
    return db.prepare('SELECT * FROM routes WHERE route_short_name = ?').get(shortName) as RouteRow | undefined;
  }

  function findRouteById(routeId: string): RouteRow | undefined {
    return db.prepare('SELECT * FROM routes WHERE route_id = ?').get(routeId) as RouteRow | undefined;
  }

  function scheduledTimesForStop(stopId: string, limit = 40): StopTimeRow[] {
    return db.prepare('SELECT * FROM stop_times WHERE stop_id = ? ORDER BY departure_time ASC LIMIT ?').all(stopId, limit) as StopTimeRow[];
  }

  function stopsForRoute(routeId: string, directionId: number): (StopRow & { stop_sequence: number })[] {
    return db
      .prepare(
        `SELECT s.*, MIN(st.stop_sequence) as stop_sequence FROM stop_times st
         JOIN trips t ON t.trip_id = st.trip_id
         JOIN stops s ON s.stop_id = st.stop_id
         WHERE t.route_id = ? AND t.direction_id = ?
         GROUP BY s.stop_id
         ORDER BY stop_sequence ASC`,
      )
      .all(routeId, directionId) as (StopRow & { stop_sequence: number })[];
  }

  // Horários programados de partida (origem) da linha, pra tabela de horários da LineDetailScreen.
  function scheduleForRoute(routeId: string, directionId: number, limit = 60): string[] {
    const rows = db
      .prepare(
        `SELECT DISTINCT st.departure_time FROM stop_times st
         JOIN trips t ON t.trip_id = st.trip_id
         WHERE t.route_id = ? AND t.direction_id = ? AND st.stop_sequence = 1 AND st.departure_time IS NOT NULL
         ORDER BY st.departure_time ASC
         LIMIT ?`,
      )
      .all(routeId, directionId, limit) as { departure_time: string }[];
    return rows.map((r) => r.departure_time.slice(0, 5));
  }

  function shapeForRoute(routeId: string, directionId: number): ShapePoint[] {
    const trip = db.prepare('SELECT shape_id FROM trips WHERE route_id = ? AND direction_id = ? AND shape_id IS NOT NULL LIMIT 1').get(routeId, directionId) as
      | { shape_id: string }
      | undefined;
    if (!trip) return [];
    return db.prepare('SELECT shape_pt_lat, shape_pt_lon, shape_pt_sequence FROM shapes WHERE shape_id = ? ORDER BY shape_pt_sequence ASC').all(trip.shape_id) as ShapePoint[];
  }

  // Todo trecho (mesmo trip_id) que passa por uma das paradas de origem ANTES de passar por uma
  // das paradas de destino — candidatos a viagem direta de ônibus. Uma linha com muitas viagens
  // no dia aparece várias vezes (uma por horário); o planner escolhe a próxima depois do horário desejado.
  function findDirectTrips(originStopIds: string[], destStopIds: string[]): DirectTripRow[] {
    if (originStopIds.length === 0 || destStopIds.length === 0) return [];
    const originPlaceholders = originStopIds.map(() => '?').join(',');
    const destPlaceholders = destStopIds.map(() => '?').join(',');
    return db
      .prepare(
        `SELECT
           st1.trip_id as trip_id, t.route_id as route_id, t.direction_id as direction_id,
           st1.stop_id as origin_stop_id, st1.stop_sequence as origin_seq, st1.departure_time as origin_departure,
           st2.stop_id as dest_stop_id, st2.stop_sequence as dest_seq, st2.arrival_time as dest_arrival
         FROM stop_times st1
         JOIN stop_times st2 ON st1.trip_id = st2.trip_id AND st2.stop_sequence > st1.stop_sequence
         JOIN trips t ON t.trip_id = st1.trip_id
         WHERE st1.stop_id IN (${originPlaceholders}) AND st2.stop_id IN (${destPlaceholders})`,
      )
      .all(...originStopIds, ...destStopIds) as DirectTripRow[];
  }

  function stopTimeOnTrip(tripId: string, stopId: string): StopTimeRow | undefined {
    return db.prepare('SELECT * FROM stop_times WHERE trip_id = ? AND stop_id = ?').get(tripId, stopId) as StopTimeRow | undefined;
  }

  // Todas as (parada, sequência, trip, rota, direção) em que uma das `stopIds` aparece — usado
  // pelo planner para montar candidatos de baldeação (que rotas passam por uma parada de origem/destino).
  function tripStopsAt(stopIds: string[]): (StopTimeRow & { route_id: string; direction_id: number | null })[] {
    if (stopIds.length === 0) return [];
    const placeholders = stopIds.map(() => '?').join(',');
    return db
      .prepare(
        `SELECT st.*, t.route_id as route_id, t.direction_id as direction_id
         FROM stop_times st
         JOIN trips t ON t.trip_id = st.trip_id
         WHERE st.stop_id IN (${placeholders})`,
      )
      .all(...stopIds) as (StopTimeRow & { route_id: string; direction_id: number | null })[];
  }

  return {
    db,
    createSchema,
    gtfsIsImported,
    findStopByCode,
    findStopById,
    searchStops,
    nearbyStops,
    searchRoutes,
    findRouteByShortName,
    findRouteById,
    scheduledTimesForStop,
    stopTimeOnTrip,
    stopsForRoute,
    scheduleForRoute,
    shapeForRoute,
    findDirectTrips,
    tripStopsAt,
  };
}

const DB_DIR = path.join(process.cwd(), 'data');
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

export const gtfsDb = createGtfsDb(path.join(DB_DIR, 'gtfs.db'));

// Mantidos para não precisar reescrever os imports já existentes em routes/stops.ts e routes/lines.ts.
export const db = gtfsDb.db;
export const createSchema = gtfsDb.createSchema;
export const gtfsIsImported = gtfsDb.gtfsIsImported;
export const findStopByCode = gtfsDb.findStopByCode;
export const searchStops = gtfsDb.searchStops;
export const nearbyStops = gtfsDb.nearbyStops;
export const searchRoutes = gtfsDb.searchRoutes;
export const findRouteByShortName = gtfsDb.findRouteByShortName;
export const scheduledTimesForStop = gtfsDb.scheduledTimesForStop;
export const stopsForRoute = gtfsDb.stopsForRoute;
export const scheduleForRoute = gtfsDb.scheduleForRoute;
export const shapeForRoute = gtfsDb.shapeForRoute;
