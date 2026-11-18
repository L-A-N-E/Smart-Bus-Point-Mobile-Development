import { buildGraph, dijkstra, Graph, nearestNodeId } from '../utils/graph';
import { haversineMeters } from '../utils/geo';

// Trajeto real pelas ruas: busca as vias da região no OpenStreetMap (Overpass API), monta um
// grafo (nós = cruzamentos, arestas = trechos de rua) e usa Dijkstra para achar o menor caminho
// entre dois pontos. Usado no mapa do detalhe da rota pra desenhar o trajeto seguindo as ruas de
// verdade, tanto a pé quanto no trecho de ônibus (que aqui não tem o shape real da viagem).
//
// Falha graciosamente: se a Overpass estiver fora, o segmento for longo demais ou não houver
// caminho no grafo, cai para uma linha reta entre os dois pontos — o mapa nunca quebra por isso.

export type LatLng = { lat: number; lng: number };

// A instância principal (overpass-api.de) fica frequentemente fora do ar ou sobrecarregada pro
// uso gratuito — sem fallback, isso derruba o roteamento por ruas pro modo linha reta o tempo
// todo. Tenta cada mirror em sequência até um responder.
const OVERPASS_URLS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Acima disso não vale a pena montar um grafo de ruas (ex.: "caminhada" até um ponto turístico
// do outro lado da cidade) — a Overpass ficaria lenta e o grafo, grande demais pro aparelho.
const MAX_SEGMENT_METERS = 3000;
const BBOX_PADDING_METERS = 250;
const METERS_PER_LAT_DEGREE = 111_320;
// Timeout por mirror — soma de todos os mirrors ainda fica abaixo do que seria aceitável esperar
// a tela de detalhe da rota carregar o trajeto.
const OVERPASS_TIMEOUT_MS = 8_000;

type OverpassNode = { type: 'node'; id: number; lat: number; lon: number };
type OverpassWay = { type: 'way'; id: number; nodes: number[] };
type OverpassElement = OverpassNode | OverpassWay | { type: 'relation' };

type BBox = { south: number; west: number; north: number; east: number };

function metersToLatDegrees(meters: number): number {
  return meters / METERS_PER_LAT_DEGREE;
}

function metersToLngDegrees(meters: number, atLat: number): number {
  return meters / (METERS_PER_LAT_DEGREE * Math.cos((atLat * Math.PI) / 180));
}

function boundingBox(a: LatLng, b: LatLng): BBox {
  const south = Math.min(a.lat, b.lat);
  const north = Math.max(a.lat, b.lat);
  const west = Math.min(a.lng, b.lng);
  const east = Math.max(a.lng, b.lng);
  const midLat = (south + north) / 2;
  const dLat = metersToLatDegrees(BBOX_PADDING_METERS);
  const dLng = metersToLngDegrees(BBOX_PADDING_METERS, midLat);
  return { south: south - dLat, west: west - dLng, north: north + dLat, east: east + dLng };
}

function bboxKey(bbox: BBox): string {
  const round = (n: number) => n.toFixed(4);
  return `${round(bbox.south)},${round(bbox.west)},${round(bbox.north)},${round(bbox.east)}`;
}

// Cache em memória por bbox: a mesma dupla origem/destino (ou trechos próximos) não bate a
// Overpass de novo enquanto o app estiver aberto.
const graphCache = new Map<string, Promise<Graph | null>>();

async function fetchFromMirror(url: string, query: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      // A Overpass exige um User-Agent "de verdade" — sem ele, a nginx na frente recusa com 406
      // antes mesmo de rotear pro serviço. Precisa ser ASCII puro: o OkHttp do Android rejeita
      // (IllegalArgumentException) qualquer char fora de ASCII em valor de header.
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SmartBusPoint/1.0 (demo app)' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGraphForBBox(bbox: BBox): Promise<Graph | null> {
  // "highway" cobre tanto vias de carro/ônibus quanto calçadas/caminhos — exclui só rodovias,
  // que não são por onde se caminha nem onde ônibus urbano para.
  const query = `[out:json][timeout:20];way["highway"]["highway"!~"^(motorway|motorway_link)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});(._;>;);out skel qt;`;

  // Tenta cada mirror em sequência — a instância principal costuma ficar fora do ar ou
  // sobrecarregada; sem fallback, qualquer timeout aqui derruba pra linha reta.
  let res: Response | null = null;
  for (const url of OVERPASS_URLS) {
    try {
      const attempt = await fetchFromMirror(url, query);
      if (attempt.ok) {
        res = attempt;
        break;
      }
    } catch {
      // tenta o próximo mirror
    }
  }
  if (!res) throw new Error('Todos os mirrors da Overpass falharam');

  const data = (await res.json()) as { elements: OverpassElement[] };

  const nodes = data.elements
    .filter((e): e is OverpassNode => e.type === 'node')
    .map((n) => ({ id: String(n.id), lat: n.lat, lng: n.lon }));

  const edges: [string, string][] = [];
  for (const el of data.elements) {
    if (el.type !== 'way') continue;
    for (let i = 0; i < el.nodes.length - 1; i++) edges.push([String(el.nodes[i]), String(el.nodes[i + 1])]);
  }

  if (nodes.length === 0) return null;
  return buildGraph(nodes, edges);
}

function getGraph(a: LatLng, b: LatLng): Promise<Graph | null> {
  const bbox = boundingBox(a, b);
  const key = bboxKey(bbox);
  if (!graphCache.has(key)) {
    graphCache.set(
      key,
      fetchGraphForBBox(bbox).catch(() => null),
    );
  }
  return graphCache.get(key)!;
}

// Menor caminho real (pelas ruas, via Dijkstra) entre dois pontos. Cai para uma linha reta nos
// casos em que o grafo de ruas não ajuda: segmento longo demais, Overpass indisponível, ou
// nenhum caminho encontrado entre os nós mais próximos (ex.: ponto isolado no grafo baixado).
export async function streetPath(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const straight = [from, to];
  if (haversineMeters(from.lat, from.lng, to.lat, to.lng) > MAX_SEGMENT_METERS) return straight;

  try {
    const graph = await getGraph(from, to);
    if (!graph) return straight;

    const startId = nearestNodeId(graph, from.lat, from.lng);
    const endId = nearestNodeId(graph, to.lat, to.lng);
    if (!startId || !endId) return straight;

    const pathIds = dijkstra(graph, startId, endId);
    if (!pathIds || pathIds.length < 2) return straight;

    return pathIds.map((id) => {
      const node = graph.nodes.get(id)!;
      return { lat: node.lat, lng: node.lng };
    });
  } catch {
    return straight;
  }
}

// Trajeto completo de uma rota (origem -> paradas de ônibus -> destino), seguindo as ruas reais
// em cada trecho. Cada segmento busca seu próprio grafo (cacheado por região), em paralelo.
export async function streetPathForWaypoints(waypoints: LatLng[]): Promise<LatLng[]> {
  if (waypoints.length < 2) return waypoints;
  const segments = await Promise.all(waypoints.slice(0, -1).map((wp, i) => streetPath(wp, waypoints[i + 1])));
  return segments.flat();
}
