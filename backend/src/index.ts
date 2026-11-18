import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { networkInterfaces } from 'node:os';

import { config } from './config.js';
import { geocodeRouter } from './routes/geocode.js';
import { healthRouter } from './routes/health.js';
import { linesRouter } from './routes/lines.js';
import { railRouter } from './routes/rail.js';
import { reportsRouter } from './routes/reports.js';
import { routesRouter } from './routes/routes.js';
import { stopsRouter } from './routes/stops.js';
import { createSchema } from './services/gtfsDb.js';
import { rateLimit } from './services/rateLimit.js';
import { BadRequest } from './validation.js';

createSchema();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
// Limite generoso (a previsão/posição já tem cache de poucos segundos): protege a Olho Vivo de
// um cliente preso em loop, sem incomodar o uso normal do app (polling a cada 10-15s).
app.use('/api', rateLimit(120, 60_000));

app.use('/api/health', healthRouter);
app.use('/api/stops', stopsRouter);
app.use('/api/lines', linesRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/routes', routesRouter);
app.use('/api/rail', railRouter);
app.use('/api/reports', reportsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof BadRequest) {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(502).json({ error: 'Falha ao processar o pedido.' });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  const lanIps = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address);

  console.log(`\n🚌 S.B.P. API rodando na porta ${config.port}`);
  console.log(`   Local:  http://localhost:${config.port}/api/health`);
  lanIps.forEach((ip) => console.log(`   Rede:   http://${ip}:${config.port}/api/health`));

  if (!config.olhoVivo.token) {
    console.warn('\n⚠️  OLHOVIVO_TOKEN não definido em backend/.env — chegadas em tempo real ficarão indisponíveis.');
  }
  console.log('');
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ A porta ${config.port} já está em uso (outro backend rodando?). Feche-o ou defina PORT no .env.`);
    process.exit(1);
  }
  throw err;
});
