import { randomUUID } from 'node:crypto';

import { localDb } from './localDb.js';

// Relatos anônimos de lotação/problema por parada ou linha. Nenhum dado pessoal é guardado —
// nem o IP do cliente (poderia ser usado para des-anonimizar quem fez o relato).

export type ReportType = 'crowding' | 'problem';
export type CrowdingValue = 'empty' | 'medium' | 'full';
export type ProblemValue = 'no_show' | 'not_accessible' | 'delay';

export type Report = {
  id: string;
  stopCode: string | null;
  line: string | null;
  type: ReportType;
  value: CrowdingValue | ProblemValue;
  createdAt: string;
};

const RECENT_WINDOW_MS = 30 * 60 * 1000;

export function createReport(input: { stopCode?: string; line?: string; type: ReportType; value: string }): Report {
  const report: Report = {
    id: randomUUID(),
    stopCode: input.stopCode ?? null,
    line: input.line ?? null,
    type: input.type,
    value: input.value as Report['value'],
    createdAt: new Date().toISOString(),
  };
  localDb
    .prepare('INSERT INTO reports (id, stop_code, line, type, value, created_at) VALUES (?,?,?,?,?,?)')
    .run(report.id, report.stopCode, report.line, report.type, report.value, report.createdAt);
  return report;
}

export function recentReports(filter: { stopCode?: string; line?: string }): Report[] {
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const clauses: string[] = ['created_at >= ?'];
  const params: string[] = [since];

  if (filter.stopCode) {
    clauses.push('stop_code = ?');
    params.push(filter.stopCode);
  }
  if (filter.line) {
    clauses.push('line = ?');
    params.push(filter.line);
  }

  const rows = localDb
    .prepare(`SELECT * FROM reports WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`)
    .all(...params) as { id: string; stop_code: string | null; line: string | null; type: string; value: string; created_at: string }[];

  return rows.map((r) => ({ id: r.id, stopCode: r.stop_code, line: r.line, type: r.type as ReportType, value: r.value as Report['value'], createdAt: r.created_at }));
}
