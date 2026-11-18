// Cache em memória com TTL por entrada. Um único Map por processo — reinicia o backend pra limpar.
// Entradas vencidas continuam guardadas (até a próxima gravação da mesma chave) só pra servir de
// fallback ("dados de X min atrás") quando a fonte externa falha — ver `cached()`.

type Entry<T> = { value: T; savedAt: number; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

function peek<T>(key: string): Entry<T> | undefined {
  return store.get(key) as Entry<T> | undefined;
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = peek<T>(key);
  if (!entry || entry.expiresAt < Date.now()) return undefined;
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, savedAt: Date.now(), expiresAt: Date.now() + ttlMs });
}

// Idade (em segundos) do valor guardado (mesmo vencido) — usado pro "atualizado há Xs".
export function cacheAgeSeconds(key: string): number | undefined {
  const entry = peek(key);
  return entry ? Math.round((Date.now() - entry.savedAt) / 1000) : undefined;
}

// Busca no cache; se ausente/vencido, chama `fn`, guarda o resultado e devolve.
// Se `fn` falhar, devolve o último valor guardado (mesmo vencido) quando existir.
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<{ value: T; stale: boolean }> {
  const fresh = cacheGet<T>(key);
  if (fresh !== undefined) return { value: fresh, stale: false };

  try {
    const value = await fn();
    cacheSet(key, value, ttlMs);
    return { value, stale: false };
  } catch (err) {
    const previous = peek<T>(key);
    if (previous) return { value: previous.value, stale: true };
    throw err;
  }
}

export const TTL = {
  predictions: 15_000,
  positions: 10_000,
  railStatus: 30_000,
  geocoding: 24 * 60 * 60 * 1000,
};
