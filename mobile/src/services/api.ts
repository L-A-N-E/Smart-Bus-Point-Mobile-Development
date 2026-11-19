import Constants from 'expo-constants';

import {
  mockArrivalsForStop,
  mockCreateReport,
  mockGeocode,
  mockNearbyStops,
  mockPlanRoute,
  mockRailStatus,
  mockRecentReports,
  mockScheduleForLine,
  mockSearchLines,
  mockSearchStops,
  mockShapeForLine,
  mockStopByCode,
  mockVehiclesForLine,
} from '../data/mock';

// Cliente do backend do S.B.P. Em modo mock (padrão, EXPO_PUBLIC_USE_MOCK=true) nunca sai do
// aparelho; sem mock, descobre o IP do backend pelo mesmo host que está servindo o Expo (como no
// Rover), e pode ser forçado com EXPO_PUBLIC_API_URL. O app NUNCA chama a SPTrans direto.

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

function discoverApiUrl(): string {
  const forced = process.env.EXPO_PUBLIC_API_URL;
  const resolved = forced
    ? forced.replace(/\/$/, '')
    : (() => {
        const hostUri = Constants.expoConfig?.hostUri ?? (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
        const host = hostUri?.split(':')[0];
        return host ? `http://${host}:3333` : 'http://localhost:3333';
      })();

  // `http://` só é aceitável em dev (LAN do próprio Expo, nunca a internet). Numa build de
  // produção — onde `EXPO_PUBLIC_API_URL` poderia ter sido configurado errado pra um endpoint
  // sem TLS — isso mandaria token de sessão e dados do usuário em texto puro pela rede.
  if (!__DEV__ && resolved.startsWith('http://')) {
    throw new Error(`API URL insegura em build de produção: ${resolved}. Use https://.`);
  }
  return resolved;
}

const API_URL = discoverApiUrl();

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) throw new ApiError(`API respondeu ${res.status} em ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export type Stop = {
  stop_id: string;
  stop_code: string | null;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  wheelchair_boarding: number | null;
};

export type Arrival = {
  line: string;
  destination: string;
  minutes: number;
  predictedTime: string;
  accessible: boolean | null;
  confidence: 'live' | 'scheduled';
  dataAgeSeconds: number | null;
};

export type ArrivalsResponse = { stop: Stop | null; arrivals: Arrival[]; stale: boolean };

export async function getStopByCode(code: string): Promise<Stop | null> {
  if (USE_MOCK) return mockStopByCode(code) ?? null;
  try {
    return await request<Stop>(`/api/stops/${encodeURIComponent(code)}`);
  } catch {
    return null;
  }
}

export async function getArrivals(code: string, onlyAccessible: boolean): Promise<ArrivalsResponse> {
  if (USE_MOCK) {
    const arrivals = mockArrivalsForStop(code).filter((a) => !onlyAccessible || a.accessible !== false);
    return { stop: mockStopByCode(code) ?? null, arrivals, stale: false };
  }
  return request<ArrivalsResponse>(`/api/stops/${encodeURIComponent(code)}/arrivals?onlyAccessible=${onlyAccessible}`);
}

export type NearbyStop = Stop & { distance_m: number };

export async function getNearbyStops(lat: number, lng: number, radius = 600): Promise<NearbyStop[]> {
  if (USE_MOCK) return mockNearbyStops(lat, lng).filter((s) => s.distance_m <= radius * 4);
  return request<NearbyStop[]>(`/api/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
}

export async function searchStops(query: string): Promise<Stop[]> {
  if (USE_MOCK) return mockSearchStops(query);
  return request<Stop[]>(`/api/stops/search?q=${encodeURIComponent(query)}`);
}

export type LineResult = {
  routeId: string;
  vehiclesCode: number | null;
  shortName: string | null;
  longName: string | null;
  direction: 1 | 2 | null;
  destination: string | null;
  origin: string | null;
};

export async function searchLines(query: string): Promise<LineResult[]> {
  if (USE_MOCK) {
    return mockSearchLines(query).map((l) => ({
      routeId: l.routeId,
      vehiclesCode: l.vehiclesCode,
      shortName: l.shortName,
      longName: l.longName,
      direction: 1,
      destination: l.destination,
      origin: l.origin,
    }));
  }
  return request<LineResult[]>(`/api/lines/search?q=${encodeURIComponent(query)}`);
}

export type Vehicle = { prefix: string; lat: number; lng: number; accessible: boolean; ageSeconds: number | null };

export async function getLineVehicles(vehiclesCode: number): Promise<{ vehicles: Vehicle[]; stale: boolean }> {
  if (USE_MOCK) return { vehicles: mockVehiclesForLine(vehiclesCode), stale: false };
  const data = await request<{ vehicles: Vehicle[]; stale: boolean }>(`/api/lines/${vehiclesCode}/vehicles`);
  return data;
}

export async function getLineStops(routeId: string, direction: 0 | 1): Promise<(Stop & { stop_sequence: number })[]> {
  if (USE_MOCK) return [];
  return request<(Stop & { stop_sequence: number })[]>(`/api/lines/${encodeURIComponent(routeId)}/stops?direction=${direction}`);
}

export type ShapePoint = { shape_pt_lat: number; shape_pt_lon: number; shape_pt_sequence: number };

export async function getLineShape(routeId: string, direction: 0 | 1): Promise<ShapePoint[]> {
  if (USE_MOCK) return mockShapeForLine(routeId);
  return request<ShapePoint[]>(`/api/lines/${encodeURIComponent(routeId)}/shape?direction=${direction}`);
}

export async function getLineSchedule(routeId: string, direction: 0 | 1): Promise<string[]> {
  if (USE_MOCK) return mockScheduleForLine();
  return request<string[]>(`/api/lines/${encodeURIComponent(routeId)}/schedule?direction=${direction}`);
}

export type GeocodeResult = { label: string; lat: number; lng: number };

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  if (USE_MOCK) return mockGeocode(query);
  return request<GeocodeResult[]>(`/api/geocode?q=${encodeURIComponent(query)}`);
}

export type StopRef = { id: string; code: string | null; name: string; lat: number; lng: number };

export type WalkLeg = { type: 'walk'; from: string; to: string; meters: number; minutes: number };
export type BusLeg = {
  type: 'bus';
  line: string;
  destination: string;
  fromStop: StopRef;
  toStop: StopRef;
  departAt: string;
  arriveAt: string;
  minutes: number;
  accessible: boolean | null;
  confidence: 'live' | 'scheduled';
  // Código usado para buscar a posição dos veículos da linha (useVehicles). Pode faltar em
  // respostas antigas do backend real — nesse caso o mapa simplesmente não mostra o ônibus.
  vehiclesCode?: number | null;
};
export type RouteLeg = WalkLeg | BusLeg;

export type RouteOption = {
  legs: RouteLeg[];
  departAt: string;
  arriveAt: string;
  totalMinutes: number;
  walkMeters: number;
  transfers: number;
  confidence: 'live' | 'scheduled';
  accessible: boolean | null;
  co2SavedGrams: number;
};

export type PlanRequest = {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  departAt?: string;
  arriveBy?: string;
  onlyAccessible?: boolean;
  lessWalking?: boolean;
};

export type PlanResponse = { options: RouteOption[]; gtfsImported: boolean };

export async function planRoute(req: PlanRequest): Promise<PlanResponse> {
  if (USE_MOCK) return { options: mockPlanRoute(), gtfsImported: true };
  return request<PlanResponse>('/api/routes/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export type RailStatusLevel = 'normal' | 'reduced' | 'problem';
export type RailLine = { line: string; name: string; color: string; status: string; statusLevel: RailStatusLevel; updatedAt: string };
export type RailStatusResponse = { lines: RailLine[]; stale: boolean };

export async function getRailStatus(): Promise<RailStatusResponse> {
  if (USE_MOCK) return { lines: mockRailStatus(), stale: false };
  return request<RailStatusResponse>('/api/rail/status');
}

export type ReportType = 'crowding' | 'problem';
export type Report = { id: string; stopCode: string | null; line: string | null; type: ReportType; value: string; createdAt: string };

export async function createReport(input: { stopCode?: string; line?: string; type: ReportType; value: string }): Promise<Report> {
  if (USE_MOCK) return mockCreateReport(input);
  return request<Report>('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function getRecentReports(filter: { stopCode?: string; line?: string }): Promise<Report[]> {
  if (USE_MOCK) return mockRecentReports(filter);
  const params = new URLSearchParams();
  if (filter.stopCode) params.set('stop', filter.stopCode);
  if (filter.line) params.set('line', filter.line);
  return request<Report[]>(`/api/reports?${params.toString()}`);
}
