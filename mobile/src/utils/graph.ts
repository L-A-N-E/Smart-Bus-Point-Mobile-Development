import { haversineMeters } from './geo';

// Grafo ponderado simples: nós com coordenada (pra calcular peso por distância real) e lista de
// adjacência. Usado pelo roteamento por ruas (src/services/streetRouting.ts) pra achar o menor
// caminho entre dois pontos sobre o grafo de vias extraído do OpenStreetMap.

export type GraphNode = { id: string; lat: number; lng: number };

export type Graph = {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, { to: string; weight: number }[]>;
};

export function buildGraph(nodes: GraphNode[], edges: [string, string][]): Graph {
  const nodeMap = new Map(nodes.map((n): [string, GraphNode] => [n.id, n]));
  const adjacency = new Map<string, { to: string; weight: number }[]>();

  const addDirectedEdge = (a: string, b: string) => {
    const na = nodeMap.get(a);
    const nb = nodeMap.get(b);
    if (!na || !nb) return;
    const weight = haversineMeters(na.lat, na.lng, nb.lat, nb.lng);
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push({ to: b, weight });
  };

  // Vias do OSM representam ruas de mão dupla para pedestres/visualização do trajeto — cada par
  // de nós consecutivos de uma via gera aresta nos dois sentidos.
  for (const [a, b] of edges) {
    addDirectedEdge(a, b);
    addDirectedEdge(b, a);
  }

  return { nodes: nodeMap, adjacency };
}

// Fila de prioridade binária (min-heap). Sem ela, Dijkstra precisaria varrer todos os nós não
// visitados a cada passo (O(V²)) — com heap, cada extração/inserção é O(log V), o que importa
// aqui porque o grafo de ruas de uma região pode ter alguns milhares de nós.
class MinHeap<T> {
  private items: { priority: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: T): void {
    this.items.push({ priority, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let smallest = i;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}

// Dijkstra clássico: menor caminho (por distância real, não número de arestas) entre `startId` e
// `endId`. Retorna a sequência de ids dos nós do caminho, ou null se não houver caminho.
export function dijkstra(graph: Graph, startId: string, endId: string): string[] | null {
  if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) return null;

  const dist = new Map<string, number>([[startId, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap<string>();
  heap.push(0, startId);

  while (heap.size > 0) {
    const current = heap.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === endId) break;

    for (const edge of graph.adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const candidate = (dist.get(current) ?? Infinity) + edge.weight;
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate);
        prev.set(edge.to, current);
        heap.push(candidate, edge.to);
      }
    }
  }

  if (!dist.has(endId)) return null;

  const path = [endId];
  while (path[path.length - 1] !== startId) {
    const before = prev.get(path[path.length - 1]);
    if (!before) return null;
    path.push(before);
  }
  return path.reverse();
}

// Nó do grafo mais próximo de uma coordenada (origem/destino raramente caem exatamente sobre um
// nó do OSM) — busca linear, suficiente pro tamanho dos grafos montados por região aqui.
export function nearestNodeId(graph: Graph, lat: number, lng: number): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const node of graph.nodes.values()) {
    const d = haversineMeters(lat, lng, node.lat, node.lng);
    if (d < bestDist) {
      bestDist = d;
      bestId = node.id;
    }
  }
  return bestId;
}
