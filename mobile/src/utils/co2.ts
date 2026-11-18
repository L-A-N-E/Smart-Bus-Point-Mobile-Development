import { t } from '../i18n';

// Formatação do CO2 evitado calculado pelo backend (ver backend/src/services/co2.ts para as
// constantes aproximadas usadas no cálculo — comentadas lá como estimativas a validar).
export function formatCo2Saved(grams: number): string {
  return t('results.co2Saved', { grams: Math.round(grams) });
}

// "350 g" ou "1,2 kg" — usado isoladamente (ex.: estatísticas do Perfil), sem a frase completa.
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${(grams / 1000).toFixed(1).replace('.', ',')} kg`;
}
