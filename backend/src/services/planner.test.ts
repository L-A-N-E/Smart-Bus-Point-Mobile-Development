import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBuiltinPlanner } from './planner.js';
import { createGtfsDb, GtfsDb } from './gtfsDb.js';

// Monta um GTFS mínimo em memória pra testar o algoritmo do planner builtin de verdade (não só
// tipos) — sem precisar do zip real da SPTrans. Cobre: seleção da próxima partida futura (não a
// primeira do dia), viagem direta e baldeação com caminhada entre duas paradas próximas.

function freshDb(): GtfsDb {
  const gtfsDb = createGtfsDb(':memory:');
  gtfsDb.createSchema();
  return gtfsDb;
}

function insertStop(gtfsDb: GtfsDb, id: string, name: string, lat: number, lon: number) {
  gtfsDb.db.prepare('INSERT INTO stops (stop_id, stop_code, stop_name, stop_lat, stop_lon) VALUES (?,?,?,?,?)').run(id, id, name, lat, lon);
}

function insertRoute(gtfsDb: GtfsDb, id: string, shortName: string, longName: string) {
  gtfsDb.db.prepare('INSERT INTO routes (route_id, route_short_name, route_long_name) VALUES (?,?,?)').run(id, shortName, longName);
}

function insertTrip(gtfsDb: GtfsDb, id: string, routeId: string, directionId: number) {
  gtfsDb.db.prepare('INSERT INTO trips (trip_id, route_id, service_id, direction_id) VALUES (?,?,?,?)').run(id, routeId, 'svc1', directionId);
}

function insertStopTime(gtfsDb: GtfsDb, tripId: string, stopId: string, seq: number, arrival: string, departure: string) {
  gtfsDb.db.prepare('INSERT INTO stop_times (trip_id, stop_id, stop_sequence, arrival_time, departure_time) VALUES (?,?,?,?,?)').run(tripId, stopId, seq, arrival, departure);
}

// "hoje às HH:MM", em ISO, pra ficar determinístico independente do fuso/hora em que o teste roda.
function todayAt(hour: number, minute: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0).toISOString();
}

test('planner: escolhe a próxima partida futura, não a primeira do dia', async () => {
  const gtfsDb = freshDb();
  insertStop(gtfsDb, 'S1', 'Origem', -23.55, -46.63);
  insertStop(gtfsDb, 'S2', 'Destino', -23.551, -46.631);
  insertRoute(gtfsDb, 'R1', '8000-10', 'Term. A - Term. B');
  insertTrip(gtfsDb, 'T_early', 'R1', 0);
  insertStopTime(gtfsDb, 'T_early', 'S1', 1, '05:00:00', '05:00:00');
  insertStopTime(gtfsDb, 'T_early', 'S2', 2, '05:20:00', '05:20:00');
  insertTrip(gtfsDb, 'T_next', 'R1', 0);
  insertStopTime(gtfsDb, 'T_next', 'S1', 1, '08:00:00', '08:00:00');
  insertStopTime(gtfsDb, 'T_next', 'S2', 2, '08:20:00', '08:20:00');

  const planner = createBuiltinPlanner(gtfsDb);
  const options = await planner.plan({
    origin: { lat: -23.55, lng: -46.63 },
    destination: { lat: -23.551, lng: -46.631 },
    departAt: todayAt(7, 0),
  });

  assert.equal(options.length, 1);
  const [option] = options;
  assert.equal(option.transfers, 0);
  const busLeg = option.legs.find((l) => l.type === 'bus');
  assert.ok(busLeg && busLeg.type === 'bus');
  assert.equal(busLeg.line, '8000-10');
  assert.equal(new Date(busLeg.departAt).getHours(), 8);
  assert.equal(new Date(busLeg.departAt).getMinutes(), 0);
});

test('planner: monta opção com 1 baldeação quando não há linha direta', async () => {
  const gtfsDb = freshDb();
  // Origem, baldeação e destino bem separados entre si (> 800 m cada) — só a parada de baldeação
  // (T/TPRIME) conecta origem a destino; nenhuma delas vira candidata "direta" por acaso.
  insertStop(gtfsDb, 'ORIGIN', 'Parada de origem', -23.55, -46.63);
  insertStop(gtfsDb, 'T', 'Parada de baldeação (desce)', -23.56, -46.64);
  insertStop(gtfsDb, 'TPRIME', 'Parada de baldeação (sobe)', -23.5601, -46.6401); // ~15 m de T
  insertStop(gtfsDb, 'DEST', 'Parada de destino', -23.57, -46.65);

  insertRoute(gtfsDb, 'RA', '100A-10', 'Linha A');
  insertTrip(gtfsDb, 'TA', 'RA', 0);
  insertStopTime(gtfsDb, 'TA', 'ORIGIN', 1, '08:00:00', '08:00:00');
  insertStopTime(gtfsDb, 'TA', 'T', 2, '08:10:00', '08:10:00');

  insertRoute(gtfsDb, 'RB', '200B-10', 'Linha B');
  insertTrip(gtfsDb, 'TB', 'RB', 0);
  insertStopTime(gtfsDb, 'TB', 'TPRIME', 1, '08:15:00', '08:15:00');
  insertStopTime(gtfsDb, 'TB', 'DEST', 2, '08:30:00', '08:30:00');

  const planner = createBuiltinPlanner(gtfsDb);
  const options = await planner.plan({
    origin: { lat: -23.55, lng: -46.63 },
    destination: { lat: -23.57, lng: -46.65 },
    departAt: todayAt(7, 0),
  });

  assert.equal(options.length, 1);
  const [option] = options;
  assert.equal(option.transfers, 1);
  assert.equal(option.legs.length, 5);
  assert.equal(option.legs[0].type, 'walk');
  assert.equal(option.legs[1].type, 'bus');
  assert.equal(option.legs[2].type, 'walk');
  assert.equal(option.legs[3].type, 'bus');
  assert.equal(option.legs[4].type, 'walk');
  assert.ok(option.co2SavedGrams > 0);
  assert.ok(option.totalMinutes > 0 && option.totalMinutes < 120);
});

test('planner: sem paradas a até 800 m, devolve lista vazia', async () => {
  const gtfsDb = freshDb();
  insertStop(gtfsDb, 'FAR', 'Parada distante', -23.0, -46.0);

  const planner = createBuiltinPlanner(gtfsDb);
  const options = await planner.plan({
    origin: { lat: -23.55, lng: -46.63 },
    destination: { lat: -23.56, lng: -46.64 },
    departAt: todayAt(7, 0),
  });

  assert.deepEqual(options, []);
});
