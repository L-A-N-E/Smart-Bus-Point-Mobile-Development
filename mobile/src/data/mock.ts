// Fixtures do modo mock (EXPO_PUBLIC_USE_MOCK=true): paradas, linhas, previsões e traçados fixos
// da região da Av. Paulista, pra demonstrar o app sem backend nem token da SPTrans.
// As "chegadas" ao vivo são calculadas a partir do relógio (não ficam paradas), pra dar a
// sensação de atualização mesmo sem rede.

export type MockStop = {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  wheelchair_boarding: 0 | 1;
};

export type MockLine = {
  routeId: string;
  vehiclesCode: number;
  shortName: string;
  longName: string;
  destination: string;
  origin: string;
};

export const mockStops: MockStop[] = [
  { stop_id: '1001', stop_code: '340015550', stop_name: 'Av. Paulista, 900 (MASP)', stop_lat: -23.5613, stop_lon: -46.6565, wheelchair_boarding: 1 },
  { stop_id: '1002', stop_code: '340015551', stop_name: 'Av. Paulista, 1578 (Consolação)', stop_lat: -23.5577, stop_lon: -46.6617, wheelchair_boarding: 1 },
  { stop_id: '1003', stop_code: '340022310', stop_name: 'Terminal Bandeira', stop_lat: -23.5455, stop_lon: -46.6361, wheelchair_boarding: 1 },
  { stop_id: '1004', stop_code: '340022400', stop_name: 'Praça da Sé', stop_lat: -23.5505, stop_lon: -46.6333, wheelchair_boarding: 0 },
  { stop_id: '1005', stop_code: '340030120', stop_name: 'Rua Augusta, 1200', stop_lat: -23.5556, stop_lon: -46.6610, wheelchair_boarding: 0 },
  { stop_id: '1006', stop_code: '340030200', stop_name: 'Parque Trianon', stop_lat: -23.5637, stop_lon: -46.6544, wheelchair_boarding: 1 },
];

export const mockLines: MockLine[] = [
  { routeId: 'r8000', vehiclesCode: 34027, shortName: '8000-10', longName: 'Term. Pinheiros - Term. Bandeira', destination: 'Term. Bandeira', origin: 'Term. Pinheiros' },
  { routeId: 'r9record', vehiclesCode: 34512, shortName: '477P-10', longName: 'Jd. Aeroporto - Pça. Ramos de Azevedo', destination: 'Pça. Ramos de Azevedo', origin: 'Jd. Aeroporto' },
  { routeId: 'r6450', vehiclesCode: 33981, shortName: '675C-10', longName: 'Term. Bandeira - Santa Cecília', destination: 'Santa Cecília', origin: 'Term. Bandeira' },
  { routeId: 'r5154', vehiclesCode: 35102, shortName: '5154-10', longName: 'Metrô Sé - Jd. São Luís', destination: 'Jd. São Luís', origin: 'Metrô Sé' },
];

export type MockArrival = {
  line: string;
  destination: string;
  minutes: number;
  predictedTime: string;
  accessible: boolean | null;
  confidence: 'live' | 'scheduled';
  dataAgeSeconds: number | null;
};

function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Cada linha "chega" em um ciclo de minutos diferente, calculado a partir do relógio atual —
// assim os minutos vão descendo de verdade enquanto a tela fica aberta.
export function mockArrivalsForStop(stopCode: string): MockArrival[] {
  const now = Date.now();
  const seed = stopCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return mockLines.map((line, index) => {
    const cycleMinutes = 8 + ((seed + index * 7) % 12); // 8-19 min de ciclo
    const elapsedInCycle = Math.floor(now / 60000) % cycleMinutes;
    const minutes = Math.max(1, cycleMinutes - elapsedInCycle);
    const predicted = new Date(now + minutes * 60000);
    const accessible = (seed + index) % 3 !== 0; // ~2/3 dos veículos acessíveis
    const live = (seed + index) % 4 !== 3; // a maioria com dado "ao vivo"

    return {
      line: line.shortName,
      destination: line.destination,
      minutes,
      predictedTime: formatClock(predicted),
      accessible,
      confidence: live ? 'live' : 'scheduled',
      dataAgeSeconds: live ? (index * 17) % 90 : null,
    };
  });
}

export type MockVehicle = { prefix: string; lat: number; lng: number; accessible: boolean; ageSeconds: number };

export function mockVehiclesForLine(vehiclesCode: number): MockVehicle[] {
  const line = mockLines.find((l) => l.vehiclesCode === vehiclesCode) ?? mockLines[0];
  const base = mockStops[mockLines.indexOf(line) % mockStops.length];
  const t = Date.now() / 20000;
  return [0, 1, 2].map((i) => ({
    prefix: `${vehiclesCode}${i}`,
    lat: base.stop_lat + Math.sin(t + i) * 0.01,
    lng: base.stop_lon + Math.cos(t + i) * 0.01,
    accessible: i !== 2,
    ageSeconds: i * 5,
  }));
}

export function mockShapeForLine(routeId: string): { shape_pt_lat: number; shape_pt_lon: number; shape_pt_sequence: number }[] {
  const line = mockLines.find((l) => l.routeId === routeId) ?? mockLines[0];
  const start = mockStops[mockLines.indexOf(line) % mockStops.length];
  return mockStops.map((s, i) => ({ shape_pt_lat: s.stop_lat, shape_pt_lon: s.stop_lon, shape_pt_sequence: i })).concat([
    { shape_pt_lat: start.stop_lat, shape_pt_lon: start.stop_lon, shape_pt_sequence: mockStops.length },
  ]);
}

export function mockNearbyStops(lat: number, lng: number): (MockStop & { distance_m: number })[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  return mockStops
    .map((s) => ({ ...s, distance_m: Math.round(haversine(lat, lng, s.stop_lat, s.stop_lon)) }))
    .sort((a, b) => a.distance_m - b.distance_m);
}

export function mockSearchStops(query: string): MockStop[] {
  const q = query.toLowerCase();
  return mockStops.filter((s) => s.stop_name.toLowerCase().includes(q) || s.stop_code.includes(q));
}

export function mockSearchLines(query: string): MockLine[] {
  const q = query.toLowerCase();
  return mockLines.filter((l) => l.shortName.toLowerCase().includes(q) || l.longName.toLowerCase().includes(q));
}

export function mockStopByCode(code: string): MockStop | undefined {
  return mockStops.find((s) => s.stop_code === code || s.stop_id === code);
}

export function mockScheduleForLine(): string[] {
  const now = new Date();
  const times: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getTime() + i * 12 * 60000);
    times.push(formatClock(d));
  }
  return times;
}

// Geocodificação mock: alguns endereços fixos perto das paradas fictícias, pra testar o
// planejador de rotas sem backend nem internet.
const mockAddresses = [
  { label: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP', lat: -23.5605, lng: -46.656 },
  { label: 'Rua Augusta, 500 - Consolação, São Paulo - SP', lat: -23.5548, lng: -46.6603 },
  { label: 'Praça da Sé - Sé, São Paulo - SP', lat: -23.5505, lng: -46.6333 },
  { label: 'Terminal Bandeira - República, São Paulo - SP', lat: -23.5455, lng: -46.6361 },
  { label: 'Rua Rocha, 91 - Bela Vista, São Paulo - SP', lat: -23.5614, lng: -46.6486 },
  { label: 'FIAP Paulista - Av. Paulista, 1106 - Bela Vista, São Paulo - SP', lat: -23.5637, lng: -46.6534 },
];

// Busca por qualquer palavra da consulta (não só a frase inteira): "FIAP Av Paulista" precisa
// achar o endereço cujo rótulo contém "FIAP", mesmo que a ordem/pontuação não bata exatamente.
// Pontua por tamanho das palavras batidas (não só a contagem): uma palavra rara e longa como
// "rocha" pesa mais que uma genérica como "rua", que aparece em quase todo endereço — sem isso,
// o primeiro resultado (usado quando o usuário não toca numa sugestão) podia vir de um endereço
// errado só porque ele aparece antes na lista.
export function mockGeocode(query: string): { label: string; lat: number; lng: number }[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const scored = mockAddresses
    .map((a) => {
      const label = a.label.toLowerCase();
      const score = words.filter((w) => label.includes(w)).reduce((sum, w) => sum + w.length, 0);
      return { address: a, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.address);

  return scored.length > 0 ? scored : mockAddresses.slice(0, 2);
}

type MockStopRef = { id: string; code: string | null; name: string; lat: number; lng: number };

function mockStopRef(stop: MockStop): MockStopRef {
  return { id: stop.stop_id, code: stop.stop_code, name: stop.stop_name, lat: stop.stop_lat, lng: stop.stop_lon };
}

export type MockRouteLeg =
  | { type: 'walk'; from: string; to: string; meters: number; minutes: number }
  | {
      type: 'bus';
      line: string;
      destination: string;
      fromStop: MockStopRef;
      toStop: MockStopRef;
      departAt: string;
      arriveAt: string;
      minutes: number;
      accessible: boolean | null;
      confidence: 'live' | 'scheduled';
      vehiclesCode: number;
    };

export type MockRouteOption = {
  legs: MockRouteLeg[];
  departAt: string;
  arriveAt: string;
  totalMinutes: number;
  walkMeters: number;
  transfers: number;
  confidence: 'live' | 'scheduled';
  accessible: boolean | null;
  co2SavedGrams: number;
};

// Monta 2-3 opções plausíveis usando as paradas/linhas fixas, com horários relativos a "agora" —
// o suficiente para exercitar toda a UI de resultados/detalhe/viagem ativa sem precisar do backend.
export function mockPlanRoute(): MockRouteOption[] {
  const now = Date.now();
  const originStop = mockStops[1];
  const transferStop = mockStops[2];
  const destStop = mockStops[3];
  const lineA = mockLines[0];
  const lineB = mockLines[2];

  const direct: MockRouteOption = {
    legs: [
      { type: 'walk', from: 'origin', to: originStop.stop_name, meters: 180, minutes: 3 },
      {
        type: 'bus',
        line: lineA.shortName,
        destination: lineA.destination,
        fromStop: mockStopRef(originStop),
        toStop: mockStopRef(destStop),
        departAt: new Date(now + 4 * 60000).toISOString(),
        arriveAt: new Date(now + 22 * 60000).toISOString(),
        minutes: 18,
        accessible: true,
        confidence: 'live',
        vehiclesCode: lineA.vehiclesCode,
      },
      { type: 'walk', from: destStop.stop_name, to: 'destination', meters: 90, minutes: 2 },
    ],
    departAt: new Date(now + 1 * 60000).toISOString(),
    arriveAt: new Date(now + 24 * 60000).toISOString(),
    totalMinutes: 23,
    walkMeters: 270,
    transfers: 0,
    confidence: 'live',
    accessible: true,
    co2SavedGrams: 420,
  };

  const withTransfer: MockRouteOption = {
    legs: [
      { type: 'walk', from: 'origin', to: originStop.stop_name, meters: 180, minutes: 3 },
      {
        type: 'bus',
        line: lineA.shortName,
        destination: transferStop.stop_name,
        fromStop: mockStopRef(originStop),
        toStop: mockStopRef(transferStop),
        departAt: new Date(now + 2 * 60000).toISOString(),
        arriveAt: new Date(now + 14 * 60000).toISOString(),
        minutes: 12,
        accessible: false,
        confidence: 'scheduled',
        vehiclesCode: lineA.vehiclesCode,
      },
      { type: 'walk', from: transferStop.stop_name, to: transferStop.stop_name, meters: 60, minutes: 1 },
      {
        type: 'bus',
        line: lineB.shortName,
        destination: lineB.destination,
        fromStop: mockStopRef(transferStop),
        toStop: mockStopRef(destStop),
        departAt: new Date(now + 17 * 60000).toISOString(),
        arriveAt: new Date(now + 30 * 60000).toISOString(),
        minutes: 13,
        accessible: true,
        confidence: 'scheduled',
        vehiclesCode: lineB.vehiclesCode,
      },
      { type: 'walk', from: destStop.stop_name, to: 'destination', meters: 90, minutes: 2 },
    ],
    departAt: new Date(now + 1 * 60000).toISOString(),
    arriveAt: new Date(now + 32 * 60000).toISOString(),
    totalMinutes: 31,
    walkMeters: 330,
    transfers: 1,
    confidence: 'scheduled',
    accessible: false,
    co2SavedGrams: 510,
  };

  return [direct, withTransfer];
}

export type MockRailLine = {
  line: string;
  name: string;
  color: string;
  status: string;
  statusLevel: 'normal' | 'reduced' | 'problem';
  updatedAt: string;
};

export function mockRailStatus(): MockRailLine[] {
  const now = new Date().toISOString();
  return [
    { line: '1', name: 'Linha 1-Azul', color: '#0a5ab5', status: 'Operação Normal', statusLevel: 'normal', updatedAt: now },
    { line: '3', name: 'Linha 3-Vermelha', color: '#ee3237', status: 'Velocidade Reduzida', statusLevel: 'reduced', updatedAt: now },
    { line: '4', name: 'Linha 4-Amarela', color: '#ffd200', status: 'Operação Normal', statusLevel: 'normal', updatedAt: now },
    { line: '7', name: 'Linha 7-Rubi', color: '#a0522d', status: 'Operação Normal', statusLevel: 'normal', updatedAt: now },
  ];
}

export type MockReport = { id: string; stopCode: string | null; line: string | null; type: 'crowding' | 'problem'; value: string; createdAt: string };

const mockReports: MockReport[] = [];

export function mockCreateReport(input: { stopCode?: string; line?: string; type: 'crowding' | 'problem'; value: string }): MockReport {
  const report: MockReport = {
    id: String(Date.now()),
    stopCode: input.stopCode ?? null,
    line: input.line ?? null,
    type: input.type,
    value: input.value,
    createdAt: new Date().toISOString(),
  };
  mockReports.unshift(report);
  return report;
}

export function mockRecentReports(filter: { stopCode?: string; line?: string }): MockReport[] {
  const since = Date.now() - 30 * 60 * 1000;
  return mockReports.filter(
    (r) => new Date(r.createdAt).getTime() >= since && (!filter.stopCode || r.stopCode === filter.stopCode) && (!filter.line || r.line === filter.line),
  );
}
