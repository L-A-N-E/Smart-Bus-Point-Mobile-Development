import { Router } from 'express';

import { geocode } from '../services/geocode.js';
import { BadRequest } from '../validation.js';

export const geocodeRouter = Router();

geocodeRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) throw new BadRequest('Informe o parâmetro "q".');

  try {
    res.json(await geocode(q));
  } catch {
    res.status(502).json({ error: 'Falha ao consultar o serviço de geocodificação.' });
  }
});
