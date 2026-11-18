import { Router } from 'express';

import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    olhoVivoConfigured: Boolean(config.olhoVivo.token),
    trilhosAgoraConfigured: Boolean(config.trilhosAgoraApiKey),
    geocoding: config.geocoding,
    collector: config.collector,
    planner: config.planner,
  });
});
