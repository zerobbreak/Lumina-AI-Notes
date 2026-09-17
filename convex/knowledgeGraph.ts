import { query } from "./_generated/server";

/** Notes considered per graph build; keeps the O(n^2) similarity pass cheap. */
const MAX_NOTES = 150;
/** Cosine similarity floor for a semantic edge to be worth drawing. */
const SIMILARITY_THRESHOLD = 0.78;
/** Cap on semantic neighbors per note so hubs don't turn into hairballs. */
const MAX_SEMANTIC_EDGES_PER_NOTE = 3;

const WIKILINK_RE = /\[\[([^\[\]]+)\]\]/g;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

type EdgeType = "wikilink" | "semantic";

interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  score?: number;
}

/**
 * Builds the second-brain graph for the current user: nodes are notes,
 * edges come from explicit [[wikilinks]] in note content and from semantic
 * similarity between existing note embeddings — no separate links table,
 * no new embedding pipeline. Runs as a plain query since everything it
 * needs (content, embedding) is already on the note.
 */
export const getGraph = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { nodes: [], edges: [] };

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .order("desc")
      .filter((q) => q.neq(q.field("isArchived"), true))
      .take(MAX_NOTES);

    if (notes.length === 0) return { nodes: [], edges: [] };

    const titleToId = new Map<string, string>();
    for (const n of notes) {
      titleToId.set(n.title.trim().toLowerCase(), n._id);
    }

    const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const edgesByKey = new Map<string, GraphEdge>();

    // Explicit [[wikilinks]] parsed straight out of note content.
    for (const n of notes) {
      if (!n.content) continue;
      for (const m of n.content.matchAll(WIKILINK_RE)) {
        const targetId = titleToId.get(m[1].trim().toLowerCase());
        if (!targetId || targetId === n._id) continue;
        edgesByKey.set(edgeKey(n._id, targetId), {
          source: n._id,
          target: targetId,
          type: "wikilink",
        });
      }
    }

    // Semantic similarity: brute-force pairwise cosine over existing
    // embeddings, top-K per note above threshold. A wikilink already
    // covering a pair takes precedence over the fuzzy semantic edge.
    const withEmbedding = notes.filter(
      (n) => Array.isArray(n.embedding) && n.embedding.length > 0,
    );
    for (let i = 0; i < withEmbedding.length; i++) {
      const a = withEmbedding[i];
      const scored: { id: string; score: number }[] = [];
      for (let j = 0; j < withEmbedding.length; j++) {
        if (i === j) continue;
        const b = withEmbedding[j];
        const score = cosineSimilarity(
          a.embedding as number[],
          b.embedding as number[],
        );
        if (score >= SIMILARITY_THRESHOLD) scored.push({ id: b._id, score });
      }
      scored.sort((x, y) => y.score - x.score);
      for (const s of scored.slice(0, MAX_SEMANTIC_EDGES_PER_NOTE)) {
        const key = edgeKey(a._id, s.id);
        if (edgesByKey.has(key)) continue;
        edgesByKey.set(key, {
          source: a._id,
          target: s.id,
          type: "semantic",
          score: Math.round(s.score * 100),
        });
      }
    }

    const edges = Array.from(edgesByKey.values());

    // Connected components (union-find) stand in for "topic clusters" —
    // notes that are actually linked to each other, no separate tagging step.
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
    for (const n of notes) find(n._id);
    for (const e of edges) union(e.source, e.target);

    const connectionCount = new Map<string, number>();
    for (const e of edges) {
      connectionCount.set(e.source, (connectionCount.get(e.source) ?? 0) + 1);
      connectionCount.set(e.target, (connectionCount.get(e.target) ?? 0) + 1);
    }

    const rootSize = new Map<string, number>();
    for (const n of notes) {
      const root = find(n._id);
      rootSize.set(root, (rootSize.get(root) ?? 0) + 1);
    }
    // Singleton components are orphans, not a "cluster" — cluster 0 means
    // both "orphan" and "unclustered" (same visual treatment on the client).
    const rootToCluster = new Map<string, number>();
    Array.from(rootSize.entries())
      .filter(([, size]) => size > 1)
      .sort((a, b) => b[1] - a[1])
      .forEach(([root], idx) => rootToCluster.set(root, idx + 1));

    const nodes = notes.map((n) => {
      const count = connectionCount.get(n._id) ?? 0;
      return {
        id: n._id as string,
        title: n.title,
        connectionCount: count,
        orphan: count === 0,
        cluster: rootToCluster.get(find(n._id)) ?? 0,
      };
    });

    return { nodes, edges };
  },
});
