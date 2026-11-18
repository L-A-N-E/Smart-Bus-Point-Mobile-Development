// Lê o código da parada a partir do que a câmera capturou (ou do campo "Digitar código").
// Aceita três formatos: o deep link do app, o link curto de divulgação e o código isolado.

const PATTERNS = [
  /^sbp:\/\/parada\/(\d+)\/?$/i,
  /^https?:\/\/sbp\.app\/p\/(\d+)\/?$/i,
  /^(\d+)$/,
];

export function parseStopCode(raw: string): string | null {
  const value = raw.trim();
  for (const pattern of PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function stopDeepLink(code: string): string {
  return `sbp://parada/${code}`;
}
