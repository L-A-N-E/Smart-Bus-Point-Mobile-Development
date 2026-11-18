import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { gtfsDb } from '../services/gtfsDb.js';
import { createBuiltinPlanner, RoutePlanner } from '../services/planner.js';
import { createOlhoVivoLiveLookup } from '../services/plannerLive.js';
import { BadRequest } from '../validation.js';

export const routesRouter = Router();

const latLngSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const planSchema = z.object({
  origin: latLngSchema,
  destination: latLngSchema,
  departAt: z.string().datetime().optional(),
  arriveBy: z.string().datetime().optional(),
  onlyAccessible: z.boolean().optional(),
  lessWalking: z.boolean().optional(),
});

// O builtin planner é criado uma vez (reaproveita a conexão SQLite); se PLANNER=otp estiver
// configurado mas a integração ainda não existir, cai no builtin com aviso — nunca quebra a rota.
const liveLookup = createOlhoVivoLiveLookup(gtfsDb);
const builtinPlanner: RoutePlanner = createBuiltinPlanner(gtfsDb, liveLookup);

if (config.planner === 'otp') {
  console.warn('\n⚠️  PLANNER=otp configurado, mas a integração com OpenTripPlanner ainda não existe. Usando o planner builtin.');
}

const planner: RoutePlanner = builtinPlanner;

routesRouter.post('/plan', async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) throw new BadRequest(parsed.error.issues[0]?.message ?? 'Corpo da requisição inválido.');

  try {
    const options = await planner.plan(parsed.data);
    res.json({ options, gtfsImported: gtfsDb.gtfsIsImported() });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Falha ao calcular rotas.' });
  }
});
