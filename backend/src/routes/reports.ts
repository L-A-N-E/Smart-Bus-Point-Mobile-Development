import { Router } from 'express';
import { z } from 'zod';

import { createReport, recentReports } from '../services/reports.js';
import { BadRequest } from '../validation.js';

export const reportsRouter = Router();

const reportSchema = z
  .object({
    stopCode: z.string().min(1).optional(),
    line: z.string().min(1).optional(),
    type: z.enum(['crowding', 'problem']),
    value: z.string().min(1),
  })
  .refine((data) => data.stopCode || data.line, { message: 'Informe "stopCode" ou "line".' });

const crowdingValues = new Set(['empty', 'medium', 'full']);
const problemValues = new Set(['no_show', 'not_accessible', 'delay']);

reportsRouter.post('/', (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequest(parsed.error.issues[0]?.message ?? 'Corpo da requisição inválido.');

  const { type, value } = parsed.data;
  const validValues = type === 'crowding' ? crowdingValues : problemValues;
  if (!validValues.has(value)) throw new BadRequest(`Valor "${value}" inválido para o tipo "${type}".`);

  const report = createReport(parsed.data);
  res.status(201).json(report);
});

reportsRouter.get('/', (req, res) => {
  const stopCode = typeof req.query.stop === 'string' ? req.query.stop : undefined;
  const line = typeof req.query.line === 'string' ? req.query.line : undefined;
  res.json(recentReports({ stopCode, line }));
});
