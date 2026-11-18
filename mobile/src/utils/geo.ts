import { t } from '../i18n';

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// "120 m" ou "1,4 km" — usado em listas de paradas próximas e trechos a pé do planejador.
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} ${t('common.meters')}`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} ${t('common.kilometers')}`;
}
