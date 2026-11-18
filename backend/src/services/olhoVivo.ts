import { config } from '../config.js';

// Cliente da API Olho Vivo da SPTrans.
//
// IMPORTANTE: os nomes de campo abaixo (`cl`, `lt`, `p`, `a`, `ta`, `py`/`px`, `t`...) seguem a
// documentação pública da Olho Vivo (https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-
// guia-de-referencia/documentacao-api/). Como ainda não há um OLHOVIVO_TOKEN configurado neste
// ambiente de desenvolvimento, as respostas reais NÃO foram comparadas byte a byte com a doc —
// isso precisa ser confirmado assim que houver um token válido (ver README, seção "Dados").
//
// A sessão é feita por cookie (POST /Login/Autenticar define o cookie; as chamadas seguintes o
// reenviam). Reautentica sozinho quando a sessão expira.

type LineSearchResult = {
  cl: number; // código da linha (usado nos outros endpoints)
  lc: boolean; // circular
  lt: string; // letreiro completo
  sl: 1 | 2; // sentido: 1 = terminal principal -> secundário, 2 = o inverso
  tl: number;
  tp: string; // letreiro destino (terminal principal)
  ts: string; // letreiro origem (terminal secundário)
};

type StopResult = {
  cp: number; // código da parada
  np: string; // nome da parada
  py: number; // latitude
  px: number; // longitude
  // alguns retornos (BuscarParadasPorLinha) incluem o endereço:
  ed?: string;
};

type VehiclePosition = {
  p: string; // prefixo do veículo
  a: boolean; // acessível (true = tem elevador/rampa)
  ta: string; // data/hora da captura da posição (ISO)
  py: number;
  px: number;
};

type LinePositions = {
  hr: string; // hora da consulta
  vs: VehiclePosition[];
};

type StopPredictionVehicle = VehiclePosition & { t: string }; // t = horário previsto de chegada "HH:MM"

type StopPredictionLine = {
  c: number; // código da linha
  cl: number;
  sl: 1 | 2;
  lt0: string; // letreiro destino
  lt1: string; // letreiro origem
  qv: number; // quantidade de veículos localizados
  vs: StopPredictionVehicle[];
};

type StopPrediction = {
  hr: string;
  p: {
    cp: number;
    np: string;
    py: number;
    px: number;
    l: StopPredictionLine[];
  };
};

let sessionCookie: string | null = null;
let lastLoginAttempt = 0;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function login(): Promise<boolean> {
  if (!config.olhoVivo.token) return false;
  // Evita martelar o login se ele já falhou há pouco (ex.: token inválido).
  if (Date.now() - lastLoginAttempt < 5000) return Boolean(sessionCookie);
  lastLoginAttempt = Date.now();

  const res = await fetchWithTimeout(
    `${config.olhoVivo.baseUrl}/Login/Autenticar?token=${encodeURIComponent(config.olhoVivo.token)}`,
    { method: 'POST' },
  );
  const ok = (await res.text()).trim() === 'true';
  if (ok) {
    const setCookie = res.headers.get('set-cookie');
    sessionCookie = setCookie ? setCookie.split(';')[0] : sessionCookie;
  }
  return ok;
}

// GET autenticado com 1 retentativa: se a resposta indicar sessão inválida, reautentica e repete.
async function authedGet<T>(path: string): Promise<T> {
  if (!sessionCookie) {
    const ok = await login();
    if (!ok) throw new Error('Não foi possível autenticar na Olho Vivo (OLHOVIVO_TOKEN ausente ou inválido).');
  }

  const url = `${config.olhoVivo.baseUrl}${path}`;
  const attempt = async () => fetchWithTimeout(url, { headers: sessionCookie ? { Cookie: sessionCookie } : {} });

  let res = await attempt();
  const invalidSession = !res.ok || res.status === 401;
  if (invalidSession) {
    sessionCookie = null;
    const ok = await login();
    if (!ok) throw new Error('Sessão da Olho Vivo expirou e a reautenticação falhou.');
    res = await attempt();
  }

  if (!res.ok) throw new Error(`Olho Vivo respondeu ${res.status} em ${path}`);
  return (await res.json()) as T;
}

export async function searchLines(term: string): Promise<LineSearchResult[]> {
  return authedGet<LineSearchResult[]>(`/Linha/Buscar?termosBusca=${encodeURIComponent(term)}`);
}

// Documentação: a busca de paradas da Olho Vivo cobre hoje só paradas de corredor — para a lista
// completa, o app usa o GTFS (ver `gtfsDb.ts`).
export async function searchCorridorStops(term: string): Promise<StopResult[]> {
  return authedGet<StopResult[]>(`/Parada/Buscar?termosBusca=${encodeURIComponent(term)}`);
}

export async function stopsForLine(lineCode: number): Promise<StopResult[]> {
  return authedGet<StopResult[]>(`/Parada/BuscarParadasPorLinha?codigoLinha=${lineCode}`);
}

export async function vehiclePositionsForLine(lineCode: number): Promise<LinePositions> {
  return authedGet<LinePositions>(`/Posicao/Linha?codigoLinha=${lineCode}`);
}

export async function predictionsForStop(stopCode: number): Promise<StopPrediction> {
  return authedGet<StopPrediction>(`/Previsao/Parada?codigoParada=${stopCode}`);
}

export async function predictionsForStopAndLine(stopCode: number, lineCode: number): Promise<StopPrediction> {
  return authedGet<StopPrediction>(`/Previsao/Linha?codigoParada=${stopCode}&codigoLinha=${lineCode}`);
}

export function olhoVivoConfigured(): boolean {
  return Boolean(config.olhoVivo.token);
}
