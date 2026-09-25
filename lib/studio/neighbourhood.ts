import type { KnowledgeGraphDto, KnowledgeGraphNodeDto } from "@/types/api/knowledgeGraph";

export type GraphNeighbour = {
  node: KnowledgeGraphNodeDto;
  kind: "wikilink" | "semantic";
  score: number;
};

/** Most related notes a neighbourhood suggests or pins at once. */
export const MAX_RELATED = 12;

/**
 * A note's direct neighbours: wikilinks first, then semantic matches by score.
 * A note reached both ways counts once, as a link.
 */
export function nodeNeighbours(graph: KnowledgeGraphDto, id: string): GraphNeighbour[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const found = new Map<string, GraphNeighbour>();
  for (const e of graph.edges) {
    if (e.source !== id && e.target !== id) continue;
    const otherId = e.source === id ? e.target : e.source;
    if (otherId === id) continue;
    const node = byId.get(otherId);
    if (!node) continue;
    const prev = found.get(otherId);
    if (prev?.kind === "wikilink") continue;
    if (prev && e.type === "semantic" && prev.score >= (e.score ?? 0)) continue;
    found.set(otherId, { node, kind: e.type, score: e.score ?? 0 });
  }
  return [...found.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "wikilink" ? -1 : 1;
    return b.score - a.score;
  });
}

export type MiniMapNode = {
  id: string;
  title: string;
  pinned: boolean;
  x: number;
  y: number;
};

export type MiniMapEdge = {
  source: string;
  target: string;
  type: "wikilink" | "semantic";
};

export type Neighbourhood = {
  nodes: MiniMapNode[];
  edges: MiniMapEdge[];
  /** Neighbours of the pinned notes that aren't pinned yet (capped). */
  related: KnowledgeGraphNodeDto[];
};

/**
 * The pinned notes plus their graph neighbours, laid out for a small static
 * map: pinned notes in the middle, neighbours on a ring around them.
 * Coordinates are in a `width` × `height` box.
 */
export function computeNeighbourhood(
  graph: KnowledgeGraphDto | undefined | null,
  pinnedIds: string[],
  opts: { width?: number; height?: number; maxRelated?: number } = {},
): Neighbourhood {
  const width = opts.width ?? 280;
  const height = opts.height ?? 170;
  const maxRelated = opts.maxRelated ?? MAX_RELATED;
  if (!graph || pinnedIds.length === 0) return { nodes: [], edges: [], related: [] };

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const pinned = [...new Set(pinnedIds)].filter((id) => byId.has(id));
  const pinnedSet = new Set(pinned);

  // Best link per candidate across all pinned notes; wikilinks outrank similarity.
  const candidates = new Map<string, GraphNeighbour>();
  for (const id of pinned) {
    for (const nb of nodeNeighbours(graph, id)) {
      if (pinnedSet.has(nb.node.id)) continue;
      const prev = candidates.get(nb.node.id);
      const better =
        !prev ||
        (nb.kind === "wikilink" && prev.kind !== "wikilink") ||
        (nb.kind === prev.kind && nb.score > prev.score);
      if (better) candidates.set(nb.node.id, nb);
    }
  }
  const related = [...candidates.values()]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "wikilink" ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, maxRelated)
    .map((c) => c.node);

  const cx = width / 2;
  const cy = height / 2;
  const inner = pinned.length === 1 ? 0 : Math.min(width, height) * 0.18;
  const outerX = width / 2 - 18;
  const outerY = height / 2 - 18;

  const nodes: MiniMapNode[] = [
    ...pinned.map((id, i) => {
      const a = (2 * Math.PI * i) / pinned.length - Math.PI / 2;
      return {
        id,
        title: byId.get(id)!.title,
        pinned: true,
        x: round(cx + inner * Math.cos(a)),
        y: round(cy + inner * Math.sin(a)),
      };
    }),
    ...related.map((n, i) => {
      const a = (2 * Math.PI * i) / related.length - Math.PI / 2 + Math.PI / Math.max(related.length, 1);
      return {
        id: n.id,
        title: n.title,
        pinned: false,
        x: round(cx + outerX * Math.cos(a)),
        y: round(cy + outerY * Math.sin(a)),
      };
    }),
  ];

  const shown = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges: MiniMapEdge[] = [];
  for (const e of graph.edges) {
    if (!shown.has(e.source) || !shown.has(e.target) || e.source === e.target) continue;
    const key = [e.source, e.target].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: e.source, target: e.target, type: e.type });
  }

  return { nodes, edges, related };
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

/** Starter prompts for the graph dock, built from the selected note. */
export function suggestedPrompts(title: string, neighbourTitles: string[]): string[] {
  const noteCount = neighbourTitles.length + 1;
  const prompts = [`Explain ${title} simply`];
  prompts.push(noteCount > 1 ? `Quiz me on these ${noteCount} notes` : `Quiz me on ${title}`);
  const first = neighbourTitles[0];
  prompts.push(
    first
      ? `What's missing between ${title} and ${first}?`
      : `What's missing from ${title}?`,
  );
  return prompts;
}
