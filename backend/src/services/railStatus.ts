import { config } from '../config.js';
import { cached, TTL } from './cache.js';

// Status do metrô/trem de São Paulo via Trilhos Agora (terceiro, não oficial da ARTESP/Metrô).
// Endpoint e formato confirmados contra a documentação OpenAPI publicada em
// https://api.trilhosagora.com.br/v1/openapi.json (GET /v1/status, autenticação por
// X-API-Key ou Authorization: Bearer). Isolado detrás de `RailStatusProvider` pra poder
// trocar por uma integração oficial da ARTESP/CCM depois sem mudar o resto do backend.

export type RailStatusLevel = 'normal' | 'reduced' | 'problem';

export type RailLine = {
  line: string; // ex.: "4" (sigla da linha)
  name: string; // ex.: "Linha 4-Amarela" (rotulo)
  color: string; // hex
  status: string; // texto da operadora, ex.: "Operação Normal"
  statusLevel: RailStatusLevel;
  updatedAt: string; // atualizado_em
};

export type RailStatusResponse = { lines: RailLine[]; stale: boolean };

export interface RailStatusProvider {
  getStatus(): Promise<RailStatusResponse>;
}

type TrilhosLine = {
  linha: number;
  nome: string;
  rotulo: string;
  slug: string;
  sigla: string;
  cor: string;
  status: string;
  descricao: string;
  operadora: string;
  atualizado_em: string;
  desde: string | null;
  desde_confirmado: boolean;
  fonte?: 'redacao';
};

type TrilhosResponse = { lines: TrilhosLine[]; fetched_at: string; stale: boolean };

// A API devolve o texto livre da operadora (ex.: "Operação Normal", "Velocidade Reduzida",
// "Paralisada"); como cada operadora escreve diferente, normaliza por palavras-chave em vez de
// mapear 1:1 — qualquer coisa fora do "normal" conhecido vira "reduced" por padrão (mais seguro
// avisar de mais do que de menos) e só os termos claramente graves viram "problem".
function normalizeStatusLevel(status: string): RailStatusLevel {
  const lower = status.toLowerCase();
  if (/normal/.test(lower)) return 'normal';
  if (/paralisad|interrompid|suspens|encerrad/.test(lower)) return 'problem';
  return 'reduced';
}

function authHeaders(): HeadersInit {
  return { 'X-API-Key': config.trilhosAgoraApiKey };
}

export function createTrilhosAgoraProvider(): RailStatusProvider {
  return {
    async getStatus(): Promise<RailStatusResponse> {
      const { value } = await cached('rail-status', TTL.railStatus, async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch('https://api.trilhosagora.com.br/v1/status', { headers: authHeaders(), signal: controller.signal });
          if (!res.ok) throw new Error(`Trilhos Agora respondeu ${res.status}`);
          const data = (await res.json()) as TrilhosResponse;
          return {
            lines: data.lines.map((l) => ({
              line: l.sigla,
              name: l.rotulo,
              color: l.cor,
              status: l.status,
              statusLevel: normalizeStatusLevel(l.status),
              updatedAt: l.atualizado_em,
            })),
            stale: data.stale,
          };
        } finally {
          clearTimeout(timer);
        }
      });
      return value;
    },
  };
}

// Sem TRILHOS_API_KEY configurado: nunca chama a rede, devolve lista vazia (a tela mostra o
// aviso "indisponível" em vez de travar esperando uma chamada que vai falhar por autenticação).
export function createDisabledRailStatusProvider(): RailStatusProvider {
  return { async getStatus() { return { lines: [], stale: false }; } };
}

export function createRailStatusProvider(): RailStatusProvider {
  return config.trilhosAgoraApiKey ? createTrilhosAgoraProvider() : createDisabledRailStatusProvider();
}
