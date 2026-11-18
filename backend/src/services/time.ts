// Minutos entre agora e um horário "HH:MM" ou "HH:MM:SS" (GTFS permite >24:00:00 pra viagens que
// passam da meia-noite). Sempre considera o próximo horário futuro mais próximo — se o cálculo
// direto desse um valor muito negativo, soma 24h (o horário já é de amanhã, na prática de "cedo demais").
export function minutesUntil(time: string, now = new Date()): number {
  const parts = time.split(':').map(Number);
  const [h, m, s = 0] = parts;
  const targetSeconds = h * 3600 + m * 60 + s;
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  let diffSeconds = targetSeconds - nowSeconds;
  if (diffSeconds < -60 * 60) diffSeconds += 24 * 60 * 60;
  return Math.round(diffSeconds / 60);
}

export function ageSeconds(isoOrClock: string, now = new Date()): number | null {
  const parsed = new Date(isoOrClock);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - parsed.getTime()) / 1000));
}

export const LIVE_THRESHOLD_SECONDS = 120;

export function confidenceFromAge(age: number | null): 'live' | 'scheduled' {
  return age !== null && age < LIVE_THRESHOLD_SECONDS ? 'live' : 'scheduled';
}
