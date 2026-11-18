import { config } from '../config.js';
import { cached, TTL } from './cache.js';

// Geocodificação via OpenStreetMap Nominatim, restrita à Região Metropolitana de São Paulo
// (bounding box abaixo) — fora dela não faz sentido para o app, e reduz resultados ambíguos.
// Respeita o limite de uso do Nominatim: 1 requisição por segundo, com User-Agent próprio
// identificando o app (exigência da política de uso: https://operations.osmfoundation.org/policies/nominatim/).

// Caixa aproximada da RMSP: [minLon, minLat, maxLon, maxLat]
const RMSP_VIEWBOX = '-47.15,-24.05,-45.95,-23.25';

const USER_AGENT = 'SmartBusPoint/1.0 (contato: equipe-sbp@example.com)';

export type GeocodeResult = { label: string; lat: number; lng: number };

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000;

async function throttledFetch(url: string): Promise<Response> {
  const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  if (!config.geocoding) return [];

  const { value } = await cached(`geocode:${query.toLowerCase()}`, TTL.geocoding, async () => {
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br` +
      `&viewbox=${RMSP_VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`;
    const res = await throttledFetch(url);
    if (!res.ok) throw new Error(`Nominatim respondeu ${res.status}`);
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
  });
  return value;
}
