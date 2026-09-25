import { describe, expect, it } from "vitest";
import {
  filterSessions,
  groupSessionsByRecency,
  modeLabel,
  orderPinnedNotes,
  sessionSubline,
} from "@/lib/studio/sessions";
import { computeNeighbourhood, nodeNeighbours, suggestedPrompts } from "@/lib/studio/neighbourhood";
import type { KnowledgeGraphDto } from "@/types/api/knowledgeGraph";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 8, 25, 12, 0).getTime();

const s = (title: string, updatedAt?: number) => ({ title, createdAt: updatedAt, updatedAt });

describe("session rail", () => {
  it("filters by title, case-insensitively", () => {
    const rows = [s("Photosynthesis"), s("Cell division"), s("photo essay")];
    expect(filterSessions(rows, "PHOTO").map((r) => r.title)).toEqual(["Photosynthesis", "photo essay"]);
    expect(filterSessions(rows, "  ")).toHaveLength(3);
  });

  it("groups into this week and earlier, keeping order", () => {
    const rows = [s("a", NOW - DAY), s("b", NOW - 6 * DAY), s("c", NOW - 8 * DAY), s("d", NOW - 30 * DAY)];
    const groups = groupSessionsByRecency(rows, NOW);
    expect(groups.map((g) => g.label)).toEqual(["This week", "Earlier"]);
    expect(groups[0].sessions.map((r) => r.title)).toEqual(["a", "b"]);
    expect(groups[1].sessions.map((r) => r.title)).toEqual(["c", "d"]);
  });

  it("omits empty groups", () => {
    expect(groupSessionsByRecency([s("a", NOW)], NOW).map((g) => g.label)).toEqual(["This week"]);
    expect(groupSessionsByRecency([], NOW)).toEqual([]);
  });

  it("skips grouping when a chat has no timestamp", () => {
    const groups = groupSessionsByRecency([s("a", NOW), { title: "b" }], NOW);
    expect(groups).toEqual([{ label: null, sessions: [s("a", NOW), { title: "b" }] }]);
  });

  it("builds the mode · notes sub-line", () => {
    expect(sessionSubline({ mode: "quiz", pinnedNoteIds: ["1", "2"] })).toBe("Quiz me · 2 notes");
    expect(sessionSubline({ mode: "fill_gaps", pinnedNoteIds: ["1"] })).toBe("Fill gaps · 1 note");
    expect(sessionSubline({})).toBe("Explain · 0 notes");
    expect(modeLabel("nonsense")).toBe("Explain");
  });

  it("orders pinned notes by the session's pin order", () => {
    const notes = [{ id: "b" }, { id: "c" }, { id: "a" }];
    expect(orderPinnedNotes(notes, ["a", "b", "c"]).map((n) => n.id)).toEqual(["a", "b", "c"]);
  });
});

const graph: KnowledgeGraphDto = {
  nodes: [
    { id: "a", title: "Alpha", connectionCount: 3, orphan: false, cluster: 1 },
    { id: "b", title: "Beta", connectionCount: 2, orphan: false, cluster: 1 },
    { id: "c", title: "Gamma", connectionCount: 1, orphan: false, cluster: 2 },
    { id: "d", title: "Delta", connectionCount: 1, orphan: false, cluster: 2 },
    { id: "e", title: "Epsilon", connectionCount: 0, orphan: true, cluster: 0 },
  ],
  edges: [
    { source: "a", target: "b", type: "wikilink" },
    { source: "a", target: "c", type: "semantic", score: 40 },
    { source: "d", target: "a", type: "semantic", score: 80 },
    { source: "a", target: "b", type: "semantic", score: 90 },
    { source: "c", target: "d", type: "semantic", score: 50 },
  ],
};

describe("neighbourhood", () => {
  it("lists neighbours links-first, then by similarity, deduped", () => {
    const nbs = nodeNeighbours(graph, "a");
    expect(nbs.map((n) => [n.node.id, n.kind])).toEqual([
      ["b", "wikilink"],
      ["d", "semantic"],
      ["c", "semantic"],
    ]);
    expect(nodeNeighbours(graph, "e")).toEqual([]);
  });

  it("returns nothing without pins or graph", () => {
    expect(computeNeighbourhood(graph, [])).toEqual({ nodes: [], edges: [], related: [] });
    expect(computeNeighbourhood(undefined, ["a"])).toEqual({ nodes: [], edges: [], related: [] });
  });

  it("collects unpinned neighbours of all pinned notes", () => {
    const hood = computeNeighbourhood(graph, ["a", "b"]);
    expect(hood.related.map((n) => n.id)).toEqual(["d", "c"]);
    expect(hood.nodes.filter((n) => n.pinned).map((n) => n.id)).toEqual(["a", "b"]);
    // a-b, a-c, a-d, c-d; the duplicate a-b semantic edge is dropped.
    expect(hood.edges).toHaveLength(4);
  });

  it("ignores pinned ids missing from the graph and caps related", () => {
    const hood = computeNeighbourhood(graph, ["zz", "a"], { maxRelated: 1 });
    expect(hood.nodes.filter((n) => n.pinned).map((n) => n.id)).toEqual(["a"]);
    expect(hood.related.map((n) => n.id)).toEqual(["b"]);
  });

  it("centres a single pinned note and keeps nodes inside the box", () => {
    const hood = computeNeighbourhood(graph, ["a"], { width: 200, height: 100 });
    expect(hood.nodes[0]).toMatchObject({ id: "a", x: 100, y: 50 });
    for (const n of hood.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(200);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeLessThanOrEqual(100);
    }
  });
});

describe("suggested prompts", () => {
  it("templates from the note and its neighbours", () => {
    expect(suggestedPrompts("Osmosis", ["Diffusion", "Cells"])).toEqual([
      "Explain Osmosis simply",
      "Quiz me on these 3 notes",
      "What's missing between Osmosis and Diffusion?",
    ]);
  });

  it("falls back when the note has no neighbours", () => {
    expect(suggestedPrompts("Osmosis", [])).toEqual([
      "Explain Osmosis simply",
      "Quiz me on Osmosis",
      "What's missing from Osmosis?",
    ]);
  });
});
