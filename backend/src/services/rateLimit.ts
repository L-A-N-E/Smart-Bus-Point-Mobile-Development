import { NextFunction, Request, Response } from 'express';

// Limite simples por IP (janela fixa): evita que um cliente sozinho esgote o limite da SPTrans
// ou do Nominatim pra todo mundo. Não é pensado pra proteção contra ataque, só uso abusivo normal.

type Window = { count: number; resetAt: number };
const hits = new Map<string, Window>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const current = hits.get(ip);

    if (!current || current.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({ error: 'Muitas requisições. Aguarde um pouco e tente de novo.' });
      return;
    }

    current.count += 1;
    next();
  };
}
