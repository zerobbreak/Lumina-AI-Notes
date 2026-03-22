/**
 * Shared diagram-building utilities for converting simplified
 * node/edge labels into ReactFlow-compatible data structures.
 */

import dagre from "dagre";

const EDGE_PAIR_RE = /^(\d+)-(\d+)$/;
const MAX_LABEL_LENGTH = 80;

export type DiagramNode = {
  id: string;
  type: string;
  data: { label: string; color: string };
  position: { x: number; y: number };
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  animated: boolean;
};

export type DiagramData = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

/** Parse "sourceIndex-targetIndex" (non-negative integers only). */
export function parseDiagramEdge(
  edge: string,
): { source: number; target: number } | null {
  const t = edge.trim();
  const m = t.match(EDGE_PAIR_RE);
  if (!m) return null;
  const source = parseInt(m[1], 10);
  const target = parseInt(m[2], 10);
  if (Number.isNaN(source) || Number.isNaN(target)) return null;
  return { source, target };
}

function normalizeLabel(label: string): string {
  const s = label.trim();
  if (s.length <= MAX_LABEL_LENGTH) return s;
  return `${s.slice(0, MAX_LABEL_LENGTH - 1)}…`;
}

/** Drop invalid indices, self-loops, and duplicate undirected pairs. */
export function normalizeDiagramEdges(
  edgeStrings: string[],
  nodeCount: number,
): DiagramEdge[] {
  const seenPair = new Set<string>();
  const out: DiagramEdge[] = [];
  let ei = 0;

  for (const raw of edgeStrings) {
    const p = parseDiagramEdge(raw);
    if (!p) continue;
    const { source, target } = p;
    if (
      source < 0 ||
      target < 0 ||
      source >= nodeCount ||
      target >= nodeCount
    ) {
      continue;
    }
    if (source === target) continue;

    const a = Math.min(source, target);
    const b = Math.max(source, target);
    const pairKey = `${a}-${b}`;
    if (seenPair.has(pairKey)) continue;
    seenPair.add(pairKey);

    out.push({
      id: `e${ei++}`,
      source: String(source),
      target: String(target),
      animated: true,
    });
  }

  return out;
}

function buildUndirectedAdjacency(edges: DiagramEdge[]): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (const e of edges) {
    const s = parseInt(e.source, 10);
    const t = parseInt(e.target, 10);
    if (!adj.has(s)) adj.set(s, []);
    if (!adj.has(t)) adj.set(t, []);
    adj.get(s)!.push(t);
    adj.get(t)!.push(s);
  }
  return adj;
}

/** Shortest-path depth from node 0 (undirected). Unreachable nodes omitted. */
function depthsFromRootBFS(
  nodeCount: number,
  edges: DiagramEdge[],
): Map<number, number> {
  const depth = new Map<number, number>();
  if (nodeCount === 0) return depth;

  const adj = buildUndirectedAdjacency(edges);
  const queue: number[] = [0];
  depth.set(0, 0);

  while (queue.length > 0) {
    const u = queue.shift()!;
    const du = depth.get(u)!;
    for (const v of adj.get(u) ?? []) {
      if (!depth.has(v)) {
        depth.set(v, du + 1);
        queue.push(v);
      }
    }
  }

  return depth;
}

/** Point edges from shallower BFS depth to deeper so Dagre TB layout matches the mind map. */
function orientEdgesForLayout(
  edges: DiagramEdge[],
  depths: Map<number, number>,
): DiagramEdge[] {
  return edges.map((e) => {
    const s = parseInt(e.source, 10);
    const t = parseInt(e.target, 10);
    const ds = depths.has(s) ? depths.get(s)! : 999;
    const dt = depths.has(t) ? depths.get(t)! : 999;
    if (ds < dt) {
      return { ...e, source: String(s), target: String(t) };
    }
    if (ds > dt) {
      return { ...e, source: String(t), target: String(s) };
    }
    if (s <= t) {
      return { ...e, source: String(s), target: String(t) };
    }
    return { ...e, source: String(t), target: String(s) };
  });
}

function styleForGraphDepth(depth: number): { type: string; color: string } {
  if (depth === 0) {
    return {
      type: "concept",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
    };
  }
  if (depth === 1) {
    return {
      type: "topic",
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    };
  }
  if (depth === 2) {
    return {
      type: "subtopic",
      color: "bg-gradient-to-br from-emerald-500 to-teal-500",
    };
  }
  return {
    type: "note",
    color: "bg-gradient-to-br from-amber-400 to-orange-400",
  };
}

/** Fallback when there are no edges: tier by list index (legacy behavior). */
function styleForListIndex(index: number): { type: string; color: string } {
  if (index === 0) {
    return {
      type: "concept",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
    };
  }
  if (index <= 3) {
    return {
      type: "topic",
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    };
  }
  if (index <= 6) {
    return {
      type: "subtopic",
      color: "bg-gradient-to-br from-emerald-500 to-teal-500",
    };
  }
  return {
    type: "note",
    color: "bg-gradient-to-br from-amber-400 to-orange-400",
  };
}

function getNodeDimensions(type: string): { width: number; height: number } {
  switch (type) {
    case "concept":
      return { width: 200, height: 80 };
    case "topic":
      return { width: 160, height: 60 };
    case "subtopic":
      return { width: 120, height: 50 };
    case "note":
      return { width: 100, height: 40 };
    default:
      return { width: 150, height: 60 };
  }
}

/** Legacy grid when the model omits edges (dagre would stack nodes). */
function gridPositions(nodes: DiagramNode[]): DiagramNode[] {
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: index === 0 ? 400 : 200 + (index % 3) * 200,
      y: index === 0 ? 50 : Math.floor(index / 3) * 150 + 200,
    },
  }));
}

function applyDagreLayout(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramNode[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 150,
    ranksep: 100,
  });

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node.type);
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos || typeof pos.x !== "number") {
      return node;
    }
    return {
      ...node,
      position: {
        x: pos.x - pos.width / 2,
        y: pos.y - pos.height / 2,
      },
    };
  });
}

/**
 * Build a ReactFlow-compatible diagram from simplified node labels and
 * edge strings (format: "sourceIndex-targetIndex").
 */
export const buildDiagramData = (
  nodeLabels: string[],
  edgeStrings: string[],
): DiagramData | undefined => {
  if (nodeLabels.length === 0) return undefined;

  const labels = nodeLabels.map((l) => normalizeLabel(String(l || ""))).filter((l) => l.length > 0);
  if (labels.length === 0) return undefined;

  const n = labels.length;
  const normalizedEdges = normalizeDiagramEdges(edgeStrings, n);
  const useGraph = normalizedEdges.length > 0;
  const depths = useGraph ? depthsFromRootBFS(n, normalizedEdges) : null;
  const layoutEdges =
    useGraph && depths
      ? orientEdgesForLayout(normalizedEdges, depths)
      : [];

  const nodes: DiagramNode[] = labels.map((label, index) => {
    let style: { type: string; color: string };
    if (useGraph && depths) {
      const d = depths.get(index);
      style =
        d !== undefined
          ? styleForGraphDepth(d)
          : styleForGraphDepth(3);
    } else {
      style = styleForListIndex(index);
    }

    return {
      id: String(index),
      type: style.type,
      data: { label, color: style.color },
      position: { x: 0, y: 0 },
    };
  });

  if (layoutEdges.length === 0) {
    return { nodes: gridPositions(nodes), edges: [] };
  }

  return {
    nodes: applyDagreLayout(nodes, layoutEdges),
    edges: layoutEdges,
  };
};
