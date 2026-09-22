/** Notes considered per graph build; keeps the O(n^2) similarity pass cheap. */
const MAX_NOTES = 150;
/** Cosine similarity floor for a semantic edge to be worth drawing. */
const SIMILARITY_THRESHOLD = 0.78;
/** Cap on semantic neighbors per note so hubs don't turn into hairballs. */
const MAX_SEMANTIC_EDGES_PER_NOTE = 3;

const WIKILINK_RE = /\[\[([^\[\]]+)\]\]/g;

type NoteRow = {
  id: string;
  title: string;
  content: string | null;
  embedding: unknown;
};

type EdgeType = "wikilink" | "semantic";

export type GraphEdge = {
  source: string;
  target: string;
  type: EdgeType;
  score?: number;
};

export type GraphNode = {
  id: string;
  title: string;
  connectionCount: number;
  orphan: boolean;
  cluster: number;
};

function parseEmbedding(value: unknown): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(Number);
      } catch {
        // pgvector text form: [0.1,0.2,...]
      }
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(",").map((part) => Number(part.trim()));
    }
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Port of convex/knowledgeGraph.getGraph */
export function buildKnowledgeGraph(notes: NoteRow[]) {
  if (notes.length === 0) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };

  const titleToId = new Map<string, string>();
  for (const n of notes) {
    titleToId.set(n.title.trim().toLowerCase(), n.id);
  }

  const edgesByKey = new Map<string, GraphEdge>();

  for (const n of notes) {
    if (!n.content) continue;
    for (const m of n.content.matchAll(WIKILINK_RE)) {
      const targetId = titleToId.get(m[1]!.trim().toLowerCase());
      if (!targetId || targetId === n.id) continue;
      edgesByKey.set(edgeKey(n.id, targetId), {
        source: n.id,
        target: targetId,
        type: "wikilink",
      });
    }
  }

  const withEmbedding = notes
    .map((n) => ({ ...n, embedding: parseEmbedding(n.embedding) }))
    .filter((n): n is NoteRow & { embedding: number[] } => !!n.embedding && n.embedding.length > 0);

  for (let i = 0; i < withEmbedding.length; i++) {
    const a = withEmbedding[i]!;
    const scored: { id: string; score: number }[] = [];
    for (let j = 0; j < withEmbedding.length; j++) {
      if (i === j) continue;
      const b = withEmbedding[j]!;
      const score = cosineSimilarity(a.embedding, b.embedding);
      if (score >= SIMILARITY_THRESHOLD) scored.push({ id: b.id, score });
    }
    scored.sort((x, y) => y.score - x.score);
    for (const s of scored.slice(0, MAX_SEMANTIC_EDGES_PER_NOTE)) {
      const key = edgeKey(a.id, s.id);
      if (edgesByKey.has(key)) continue;
      edgesByKey.set(key, {
        source: a.id,
        target: s.id,
        type: "semantic",
        score: Math.round(s.score * 100),
      });
    }
  }

  const edges = [...edgesByKey.values()];

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const n of notes) find(n.id);
  for (const e of edges) union(e.source, e.target);

  const connectionCount = new Map<string, number>();
  for (const e of edges) {
    connectionCount.set(e.source, (connectionCount.get(e.source) ?? 0) + 1);
    connectionCount.set(e.target, (connectionCount.get(e.target) ?? 0) + 1);
  }

  const rootSize = new Map<string, number>();
  for (const n of notes) {
    const root = find(n.id);
    rootSize.set(root, (rootSize.get(root) ?? 0) + 1);
  }

  const rootToCluster = new Map<string, number>();
  [...rootSize.entries()]
    .filter(([, size]) => size > 1)
    .sort((a, b) => b[1] - a[1])
    .forEach(([root], idx) => rootToCluster.set(root, idx + 1));

  const nodes: GraphNode[] = notes.map((n) => {
    const count = connectionCount.get(n.id) ?? 0;
    return {
      id: n.id,
      title: n.title,
      connectionCount: count,
      orphan: count === 0,
      cluster: rootToCluster.get(find(n.id)) ?? 0,
    };
  });

  return { nodes, edges };
}

export { MAX_NOTES };
