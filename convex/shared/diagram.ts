/**
 * Shared diagram-building utilities for converting simplified
 * node/edge labels into ReactFlow-compatible data structures.
 */

const EDGE_PAIR_RE = /^(\d+)-(\d+)(?::([^\n]*))?$/;
const MAX_LABEL_LENGTH = 80;
const MAX_EDGE_LABEL_LENGTH = 40;

/** Matches the client's ELK hierarchical layout spacing (components/diagram/layouts.ts). */
const NODE_SPACING = 150;
const RANK_SPACING = 100;

/** Visual tier of a node; the model may declare one, otherwise it is inferred. */
export type DiagramKind = "concept" | "topic" | "subtopic" | "note";

/** A node as the model supplies it: a bare label, or a label plus a declared kind. */
export type DiagramNodeInput = string | { label?: unknown; kind?: unknown };

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
  label?: string;
};

export type DiagramData = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

function truncateLabel(label: string, max: number): string {
  const s = label.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function normalizeLabel(label: string): string {
  return truncateLabel(label, MAX_LABEL_LENGTH);
}

/**
 * Parse "sourceIndex-targetIndex" with an optional ":label" suffix
 * (e.g. "0-1: causes"). Indices must be non-negative integers; an empty or
 * whitespace-only label is dropped and a label may not span lines.
 */
export function parseDiagramEdge(
  edge: string,
): { source: number; target: number; label?: string } | null {
  const t = edge.trim();
  const m = t.match(EDGE_PAIR_RE);
  if (!m) return null;
  const source = parseInt(m[1], 10);
  const target = parseInt(m[2], 10);
  if (Number.isNaN(source) || Number.isNaN(target)) return null;
  const label =
    m[3] === undefined
      ? ""
      : truncateLabel(m[3], MAX_EDGE_LABEL_LENGTH);
  return label.length > 0 ? { source, target, label } : { source, target };
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
    const { source, target, label } = p;
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
      ...(label ? { label } : {}),
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

/** Point edges from shallower BFS depth to deeper so the TB layout matches the mind map. */
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

/** The single source of truth for how each kind is coloured. */
const KIND_COLORS: Record<DiagramKind, string> = {
  concept: "bg-gradient-to-br from-purple-500 to-pink-500",
  topic: "bg-gradient-to-br from-blue-500 to-cyan-500",
  subtopic: "bg-gradient-to-br from-emerald-500 to-teal-500",
  note: "bg-gradient-to-br from-amber-400 to-orange-400",
};

/** Narrow an arbitrary model-supplied value to a known kind. */
export function parseDiagramKind(value: unknown): DiagramKind | null {
  return typeof value === "string" && value in KIND_COLORS
    ? (value as DiagramKind)
    : null;
}

function kindForGraphDepth(depth: number): DiagramKind {
  if (depth === 0) return "concept";
  if (depth === 1) return "topic";
  if (depth === 2) return "subtopic";
  return "note";
}

/** Fallback when there are no edges: tier by list index (legacy behavior). */
function kindForListIndex(index: number): DiagramKind {
  if (index === 0) return "concept";
  if (index <= 3) return "topic";
  if (index <= 6) return "subtopic";
  return "note";
}

/**
 * Per-type box metrics. These MUST stay in step with the node components in
 * components/diagram/nodes/: `chrome` is padding + border, `maxWidth` is the
 * component's max-w-[…] cap and `maxLines` its line-clamp. Layout reserving a
 * different size than the node actually renders is what makes nodes overlap.
 */
const NODE_METRICS: Record<
  string,
  {
    minWidth: number;
    maxWidth: number;
    chromeX: number;
    chromeY: number;
    charWidth: number;
    lineHeight: number;
    maxLines: number;
  }
> = {
  // px-6 py-4 border-4, text-lg bold
  concept: {
    minWidth: 180,
    maxWidth: 260,
    chromeX: 56,
    chromeY: 40,
    charWidth: 10,
    lineHeight: 28,
    maxLines: 3,
  },
  // px-5 py-3 border-2, text-base semibold
  topic: {
    minWidth: 140,
    maxWidth: 220,
    chromeX: 44,
    chromeY: 28,
    charWidth: 8.8,
    lineHeight: 24,
    maxLines: 3,
  },
  // px-4 py-2 border, text-sm medium
  subtopic: {
    minWidth: 100,
    maxWidth: 180,
    chromeX: 34,
    chromeY: 18,
    charWidth: 7.6,
    lineHeight: 20,
    maxLines: 3,
  },
  // px-3 py-2 border + icon, text-xs
  note: {
    minWidth: 80,
    maxWidth: 160,
    chromeX: 42,
    chromeY: 18,
    charWidth: 6.4,
    lineHeight: 16,
    maxLines: 2,
  },
};

// ReactFlow's built-in root node is styled like a concept node.
NODE_METRICS.input = NODE_METRICS.concept;

const DEFAULT_METRICS = NODE_METRICS.topic;

/**
 * Estimated rendered size of a node. Width grows with the label up to the
 * component's cap; height follows from how many lines the label wraps onto at
 * that width. Without a label this returns the minimum box.
 */
export function getNodeDimensions(
  type: string,
  label?: string,
): { width: number; height: number } {
  const m = NODE_METRICS[type] ?? DEFAULT_METRICS;
  const length = label?.length ?? 0;

  const width = Math.min(
    m.maxWidth,
    Math.max(m.minWidth, Math.ceil(m.chromeX + length * m.charWidth)),
  );

  const charsPerLine = Math.max(
    1,
    Math.floor((width - m.chromeX) / m.charWidth),
  );
  const lines = Math.min(
    m.maxLines,
    Math.max(1, Math.ceil(length / charsPerLine)),
  );

  return { width, height: m.chromeY + lines * m.lineHeight };
}

/** Legacy grid when the model omits edges (a layered layout would stack nodes). */
function gridPositions(nodes: DiagramNode[]): DiagramNode[] {
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: index === 0 ? 400 : 200 + (index % 3) * 200,
      y: index === 0 ? 50 : Math.floor(index / 3) * 150 + 200,
    },
  }));
}

/** The minimum a node needs to be laid out; both diagram and roadmap nodes satisfy it. */
export type LayoutNode = {
  id: string;
  type: string;
  data?: { label?: string };
  position: { x: number; y: number };
};

export type LayoutEdge = { source: string; target: string };

/**
 * Longest-path ranks for a directed graph: nodes with no incoming edge sit at
 * rank 0, every other node one below its deepest parent. Nodes trapped in a
 * cycle get no rank and are parked in a trailing row by applyLayeredLayout.
 */
export function layeredRanks(
  nodeIds: string[],
  edges: LayoutEdge[],
): Map<string, number> {
  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of nodeIds) indegree.set(id, 0);

  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) continue;
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, indegree.get(edge.target)! + 1);
  }

  const ranks = new Map<string, number>();
  const queue: string[] = [];
  for (const id of nodeIds) {
    if (indegree.get(id) === 0) {
      ranks.set(id, 0);
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of children.get(u) ?? []) {
      const candidate = ranks.get(u)! + 1;
      if (candidate > (ranks.get(v) ?? -1)) ranks.set(v, candidate);
      indegree.set(v, indegree.get(v)! - 1);
      if (indegree.get(v) === 0) queue.push(v);
    }
  }

  return ranks;
}

/**
 * Top-to-bottom layered layout, dependency-free so it runs in Convex's default
 * (non-Node) runtime, where ELK's browser bundle cannot load. Each rank is a row
 * centred on x=0; one barycenter pass orders a row under its parents to keep
 * edge crossings down. Spacing matches the client's ELK layout.
 */
export function applyLayeredLayout<T extends LayoutNode>(
  nodes: T[],
  edges: LayoutEdge[],
  ranks: Map<string, number>,
): T[] {
  if (nodes.length === 0) return nodes;

  let maxRank = 0;
  for (const r of ranks.values()) {
    if (r > maxRank) maxRank = r;
  }

  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    if (!parents.has(edge.target)) parents.set(edge.target, []);
    parents.get(edge.target)!.push(edge.source);
  }

  const byRank = new Map<number, T[]>();
  for (const node of nodes) {
    // Unranked nodes (unreachable, or inside a cycle) go in a trailing row.
    const r = ranks.get(node.id) ?? maxRank + 1;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(node);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const orderInRank = new Map<string, number>();
  let y = 0;

  for (const rank of [...byRank.keys()].sort((a, b) => a - b)) {
    const members = byRank.get(rank)!;

    // Sort by the mean order of each node's parents in the row above. Nodes with
    // no placed parent fall back to their existing position (stable tie-break).
    const barycenter = new Map<string, number>();
    members.forEach((node, fallback) => {
      const placed = (parents.get(node.id) ?? [])
        .map((p) => orderInRank.get(p))
        .filter((o): o is number => o !== undefined);
      barycenter.set(
        node.id,
        placed.length > 0
          ? placed.reduce((sum, o) => sum + o, 0) / placed.length
          : fallback,
      );
    });
    const ordered = [...members].sort(
      (a, b) => barycenter.get(a.id)! - barycenter.get(b.id)!,
    );

    const rowWidth =
      ordered.reduce(
        (sum, n) => sum + getNodeDimensions(n.type, n.data?.label).width,
        0,
      ) + NODE_SPACING * Math.max(0, ordered.length - 1);

    let x = -rowWidth / 2;
    let rowHeight = 0;
    ordered.forEach((node, order) => {
      const { width, height } = getNodeDimensions(node.type, node.data?.label);
      positions.set(node.id, { x, y });
      orderInRank.set(node.id, order);
      x += width + NODE_SPACING;
      if (height > rowHeight) rowHeight = height;
    });

    y += rowHeight + RANK_SPACING;
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/** Split a node input into its label and any declared kind. */
function readNodeInput(input: DiagramNodeInput): {
  label: string;
  kind: DiagramKind | null;
} {
  if (typeof input === "string") {
    return { label: normalizeLabel(String(input || "")), kind: null };
  }
  if (input && typeof input === "object") {
    return {
      label: normalizeLabel(String(input.label ?? "")),
      kind: parseDiagramKind(input.kind),
    };
  }
  return { label: "", kind: null };
}

/**
 * Build a ReactFlow-compatible diagram from simplified node inputs and edge
 * strings (format: "sourceIndex-targetIndex" with an optional ":label").
 */
export const buildDiagramData = (
  nodeInputs: DiagramNodeInput[],
  edgeStrings: string[],
): DiagramData | undefined => {
  if (nodeInputs.length === 0) return undefined;

  const entries = nodeInputs
    .map(readNodeInput)
    .filter((e) => e.label.length > 0);
  if (entries.length === 0) return undefined;

  const n = entries.length;
  const normalizedEdges = normalizeDiagramEdges(edgeStrings, n);
  const useGraph = normalizedEdges.length > 0;
  const depths = useGraph ? depthsFromRootBFS(n, normalizedEdges) : null;
  const layoutEdges =
    useGraph && depths
      ? orientEdgesForLayout(normalizedEdges, depths)
      : [];

  const nodes: DiagramNode[] = entries.map(({ label, kind }, index) => {
    let resolved: DiagramKind;
    if (kind) {
      resolved = kind;
    } else if (useGraph && depths) {
      resolved = kindForGraphDepth(depths.get(index) ?? 3);
    } else {
      resolved = kindForListIndex(index);
    }

    // Exactly one concept node: the root, whatever the model declared.
    if (index === 0) resolved = "concept";
    else if (resolved === "concept") resolved = "topic";

    return {
      id: String(index),
      type: resolved,
      data: { label, color: KIND_COLORS[resolved] },
      position: { x: 0, y: 0 },
    };
  });

  if (layoutEdges.length === 0 || !depths) {
    return { nodes: gridPositions(nodes), edges: [] };
  }

  // Rank by BFS depth (already computed for styling) rather than longest path,
  // so a node sits directly under its nearest parent in the mind map.
  const ranks = new Map<string, number>();
  for (const [index, depth] of depths) {
    ranks.set(String(index), depth);
  }

  return {
    nodes: applyLayeredLayout(nodes, layoutEdges, ranks),
    // Edge direction expresses the relationship supplied by the model. The
    // shallow-to-deep orientation above is only a layout aid; persisting it
    // would invert directional labels such as "causes" when the model emits a
    // child-to-root relationship.
    edges: normalizedEdges,
  };
};
