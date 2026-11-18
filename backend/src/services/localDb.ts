import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Banco local pequeno (relatos anônimos + snapshots do collector) — separado do `gtfs.db`
// porque este um é escrito pelo próprio app em produção, não reimportado do zero a cada deploy.

const DB_DIR = path.join(process.cwd(), 'data');
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

export const localDb = new Database(path.join(DB_DIR, 'local.db'));
localDb.pragma('journal_mode = WAL');

localDb.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    stop_code TEXT,
    line TEXT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reports_stop ON reports (stop_code, created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_line ON reports (line, created_at);

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    stop_code TEXT,
    line_code TEXT,
    captured_at TEXT,
    recorded_at TEXT NOT NULL,
    payload TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_kind ON snapshots (kind, recorded_at);
`);
