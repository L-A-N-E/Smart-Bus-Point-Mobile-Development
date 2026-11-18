import { config } from '../config.js';
import { localDb } from './localDb.js';

// Grava cada previsão/posição consultada na Olho Vivo (quando COLLECTOR=on), com o horário da
// captura (`ta` da API) e o horário em que o backend gravou — serve pra medir depois a acurácia
// da previsão da SPTrans comparando previsto x chegada real observada nos snapshots seguintes.
// Puramente opt-in e de melhor esforço: nunca deixa a rota principal falhar por isso.

type SnapshotKind = 'prediction' | 'position';

const insert = localDb.prepare(
  'INSERT INTO snapshots (kind, stop_code, line_code, captured_at, recorded_at, payload) VALUES (?,?,?,?,?,?)',
);

export function recordSnapshot(kind: SnapshotKind, opts: { stopCode?: string; lineCode?: string; capturedAt?: string | null; payload: unknown }) {
  if (!config.collector) return;
  try {
    insert.run(kind, opts.stopCode ?? null, opts.lineCode ?? null, opts.capturedAt ?? null, new Date().toISOString(), JSON.stringify(opts.payload));
  } catch {
    // Nunca deixa uma falha de gravação do collector derrubar a resposta da API.
  }
}
