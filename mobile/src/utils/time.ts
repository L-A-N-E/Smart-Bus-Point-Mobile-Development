import { tn } from '../i18n';

// "atualizado há Xs" / "atualizado há X min" — usado nos selos de confiança do dado.
export function formatDataAge(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return tn('common.updated', seconds);
  return tn('common.updatedMinutes', Math.round(seconds / 60));
}

// "dados de X min atrás" — usado no estado de erro quando sobra só o cache.
export function formatCacheAge(ms: number): string {
  return tn('common.cacheAge', Math.max(1, Math.round(ms / 60000)));
}
