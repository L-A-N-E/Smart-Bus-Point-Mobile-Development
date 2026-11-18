import { parse } from 'csv-parse';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import unzipper from 'unzipper';

import { createSchema, db } from '../src/services/gtfsDb.js';

// Lê o zip do GTFS em `backend/data/gtfs/` (baixado manualmente no portal da SPTrans, que exige
// login — por isso não vem versionado) e grava stops/routes/trips/stop_times/shapes/calendar e
// frequencies (se existir) no SQLite, em streaming, pra não carregar o feed inteiro na memória.
//
// Uso: npm run gtfs:import

const GTFS_DIR = path.join(process.cwd(), 'data', 'gtfs');
const BATCH_SIZE = 2000;

function findZip(): string {
  if (!existsSync(GTFS_DIR)) {
    throw new Error(`Pasta não encontrada: ${GTFS_DIR}. Crie-a e coloque o zip do GTFS da SPTrans lá.`);
  }
  const zip = readdirSync(GTFS_DIR).find((f) => f.toLowerCase().endsWith('.zip'));
  if (!zip) {
    throw new Error(
      `Nenhum .zip encontrado em ${GTFS_DIR}. Baixe o feed no portal de desenvolvedores da SPTrans (exige login) e coloque o arquivo .zip lá.`,
    );
  }
  return path.join(GTFS_DIR, zip);
}

async function streamCsvFromZip(zipPath: string, fileName: string): Promise<AsyncIterable<Record<string, string>> | null> {
  const directory = await unzipper.Open.file(zipPath);
  const entry = directory.files.find((f) => f.path.toLowerCase().endsWith(fileName));
  if (!entry) return null;
  const stream = entry.stream();
  const parser = parse({ columns: true, skip_empty_lines: true, trim: true, bom: true });
  stream.pipe(parser);
  return parser;
}

// Processa linhas em lotes dentro de transações — muito mais rápido que 1 INSERT por linha.
async function importBatched(
  rows: AsyncIterable<Record<string, string>>,
  insertOne: (row: Record<string, string>) => void,
) {
  let batch: Record<string, string>[] = [];
  let total = 0;

  const flush = db.transaction((rowsToInsert: Record<string, string>[]) => {
    for (const row of rowsToInsert) insertOne(row);
  });

  for await (const row of rows) {
    batch.push(row);
    if (batch.length >= BATCH_SIZE) {
      flush(batch);
      total += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    flush(batch);
    total += batch.length;
  }
  return total;
}

const toIntOrNull = (v: string | undefined) => (v && v.trim() !== '' ? Number(v) : null);

async function importStops(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'stops.txt');
  if (!rows) throw new Error('stops.txt não encontrado no zip.');
  const insert = db.prepare(
    'INSERT OR REPLACE INTO stops (stop_id, stop_code, stop_name, stop_lat, stop_lon, wheelchair_boarding) VALUES (?,?,?,?,?,?)',
  );
  const total = await importBatched(rows, (r) =>
    insert.run(r.stop_id, r.stop_code || null, r.stop_name, Number(r.stop_lat), Number(r.stop_lon), toIntOrNull(r.wheelchair_boarding)),
  );
  console.log(`  stops: ${total}`);
}

async function importRoutes(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'routes.txt');
  if (!rows) throw new Error('routes.txt não encontrado no zip.');
  const insert = db.prepare(
    'INSERT OR REPLACE INTO routes (route_id, route_short_name, route_long_name, route_type, route_color) VALUES (?,?,?,?,?)',
  );
  const total = await importBatched(rows, (r) =>
    insert.run(r.route_id, r.route_short_name || null, r.route_long_name || null, toIntOrNull(r.route_type), r.route_color || null),
  );
  console.log(`  routes: ${total}`);
}

async function importTrips(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'trips.txt');
  if (!rows) throw new Error('trips.txt não encontrado no zip.');
  const insert = db.prepare(
    'INSERT OR REPLACE INTO trips (trip_id, route_id, service_id, trip_headsign, direction_id, shape_id) VALUES (?,?,?,?,?,?)',
  );
  const total = await importBatched(rows, (r) =>
    insert.run(r.trip_id, r.route_id, r.service_id, r.trip_headsign || null, toIntOrNull(r.direction_id), r.shape_id || null),
  );
  console.log(`  trips: ${total}`);
}

async function importStopTimes(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'stop_times.txt');
  if (!rows) throw new Error('stop_times.txt não encontrado no zip.');
  const insert = db.prepare(
    'INSERT INTO stop_times (trip_id, stop_id, stop_sequence, arrival_time, departure_time) VALUES (?,?,?,?,?)',
  );
  const total = await importBatched(rows, (r) =>
    insert.run(r.trip_id, r.stop_id, Number(r.stop_sequence), r.arrival_time || null, r.departure_time || null),
  );
  console.log(`  stop_times: ${total}`);
}

async function importShapes(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'shapes.txt');
  if (!rows) {
    console.log('  shapes: ausente no feed (sem shapes.txt) — traçado das linhas ficará indisponível.');
    return;
  }
  const insert = db.prepare(
    'INSERT INTO shapes (shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence) VALUES (?,?,?,?)',
  );
  const total = await importBatched(rows, (r) =>
    insert.run(r.shape_id, Number(r.shape_pt_lat), Number(r.shape_pt_lon), Number(r.shape_pt_sequence)),
  );
  console.log(`  shapes: ${total}`);
}

async function importCalendar(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'calendar.txt');
  if (!rows) {
    console.log('  calendar: ausente no feed.');
    return;
  }
  const insert = db.prepare(
    `INSERT OR REPLACE INTO calendar
     (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  const total = await importBatched(rows, (r) =>
    insert.run(
      r.service_id,
      toIntOrNull(r.monday),
      toIntOrNull(r.tuesday),
      toIntOrNull(r.wednesday),
      toIntOrNull(r.thursday),
      toIntOrNull(r.friday),
      toIntOrNull(r.saturday),
      toIntOrNull(r.sunday),
      r.start_date,
      r.end_date,
    ),
  );
  console.log(`  calendar: ${total}`);
}

async function importFrequencies(zipPath: string) {
  const rows = await streamCsvFromZip(zipPath, 'frequencies.txt');
  if (!rows) {
    console.log('  frequencies: ausente no feed (linhas sem frequência fixa, só horário por stop_times).');
    return;
  }
  const insert = db.prepare('INSERT INTO frequencies (trip_id, start_time, end_time, headway_secs) VALUES (?,?,?,?)');
  const total = await importBatched(rows, (r) =>
    insert.run(r.trip_id, r.start_time, r.end_time, Number(r.headway_secs)),
  );
  console.log(`  frequencies: ${total}`);
}

async function main() {
  const zipPath = findZip();
  console.log(`Importando ${path.basename(zipPath)}...`);

  createSchema();
  // stop_times é a maior tabela de longe: limpa e reimporta do zero pra não duplicar entre rodadas.
  db.exec('DELETE FROM stop_times; DELETE FROM shapes; DELETE FROM calendar; DELETE FROM frequencies;');

  await importStops(zipPath);
  await importRoutes(zipPath);
  await importTrips(zipPath);
  await importStopTimes(zipPath);
  await importShapes(zipPath);
  await importCalendar(zipPath);
  await importFrequencies(zipPath);

  console.log('\nImportação concluída. Índices já existem (criados em createSchema()).');
  console.log(
    '\n⚠️  Verifique se o stop_id importado corresponde ao codigoParada retornado pela Olho Vivo — a doc',
  );
  console.log('   oficial indica que a busca de paradas da API cobre só corredores; o restante vem do GTFS.');
  console.log('   Se não corresponder, grave o mapeamento em stop_code_overrides (ver gtfsDb.ts).');
}

main()
  .catch((err) => {
    console.error('\n❌', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.close());
