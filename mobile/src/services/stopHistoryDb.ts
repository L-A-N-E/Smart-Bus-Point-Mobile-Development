// Histórico de paradas consultadas, salvo em SQLite no próprio aparelho (expo-sqlite) — é o
// banco de dados do app mobile em si (distinto do SQLite do backend, que indexa o GTFS).
// Guarda só código, nome e horário da consulta: nenhum dado pessoal.
import * as SQLite from 'expo-sqlite';

export type StopVisit = {
  code: string;
  name: string;
  visitedAt: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('sbp.db').then(async (db) => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS stop_history (
           code TEXT PRIMARY KEY NOT NULL,
           name TEXT NOT NULL,
           visited_at INTEGER NOT NULL
         );`,
      );
      return db;
    });
  }
  return dbPromise;
}

export async function recordStopVisit(code: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO stop_history (code, name, visited_at) VALUES (?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET name = excluded.name, visited_at = excluded.visited_at;`,
    [code, name, Date.now()],
  );
}

export async function getRecentStopVisits(limit = 8): Promise<StopVisit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ code: string; name: string; visited_at: number }>(
    `SELECT code, name, visited_at FROM stop_history ORDER BY visited_at DESC LIMIT ?;`,
    [limit],
  );
  return rows.map((r) => ({ code: r.code, name: r.name, visitedAt: r.visited_at }));
}

export async function clearStopHistory(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM stop_history;`);
}
