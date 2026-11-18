// Previsão do tempo via Open-Meteo (https://open-meteo.com), chamada direto do app — gratuita,
// sem chave, e por isso não precisa passar pelo backend (diferente da SPTrans).

export type HourlyForecast = { time: string; precipitationProbability: number; precipitationMm: number };

type OpenMeteoResponse = {
  hourly: { time: string[]; precipitation_probability: number[]; precipitation: number[] };
};

export async function getHourlyForecast(lat: number, lng: number): Promise<HourlyForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation_probability,precipitation&forecast_days=2&timezone=auto`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}`);
    const data = (await res.json()) as OpenMeteoResponse;
    return data.hourly.time.map((time, i) => ({
      time,
      precipitationProbability: data.hourly.precipitation_probability[i] ?? 0,
      precipitationMm: data.hourly.precipitation[i] ?? 0,
    }));
  } finally {
    clearTimeout(timer);
  }
}

// Regra do app: avisa de chuva quando probabilidade >= 50% OU >= 0,5 mm na hora.
export function isRainySoon(hours: HourlyForecast[], withinHours = 3): HourlyForecast | null {
  const now = Date.now();
  const relevant = hours.filter((h) => {
    const t = new Date(h.time).getTime();
    return t >= now && t <= now + withinHours * 60 * 60 * 1000;
  });
  return relevant.find((h) => h.precipitationProbability >= 50 || h.precipitationMm >= 0.5) ?? null;
}
