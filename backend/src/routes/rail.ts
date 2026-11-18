import { Router } from 'express';

import { createRailStatusProvider } from '../services/railStatus.js';

export const railRouter = Router();

const provider = createRailStatusProvider();

railRouter.get('/status', async (_req, res) => {
  try {
    res.json(await provider.getStatus());
  } catch {
    res.status(502).json({ lines: [], stale: true, error: 'Falha ao consultar o status do metrô/trem.' });
  }
});
