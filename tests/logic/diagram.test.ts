/**
 * Tests for the shared diagram layout logic
 *
 * Covers the dependency-free layered layout that replaced dagre, which has to
 * run in Convex's default (non-Node) runtime.
 */
import { describe, it, expect } from "vitest";
import {
  applyLayeredLayout,
  buildDiagramData,
  getNodeDimensions,
  layeredRanks,
  parseDiagramEdge,
  type LayoutNode,
} from "../../convex/shared/diagram";

function node(id: string, type = "topic", label?: string): LayoutNode {
  return { id, type, data: { label }, position: { x: 0, y: 0 } };
}

describe("getNodeDimensions", () => {
  it("returns the minimum box for an unlabelled node", () => {
    expect(getNodeDimensions("concept").width).toBe(180);
    expect(getNodeDimensions("note").width).toBe(80);
  });

  it("grows with the label instead of reporting a fixed width", () => {
    const short = getNodeDimensions("topic", "CPU");
    const long = getNodeDimensions("topic", "Instruction pipelining");
    expect(long.width).toBeGreaterThan(short.width);
  });

  it("never exceeds the component's max-width cap", () => {
    // The prompts allow labels up to 80 characters.
    const label = "x".repeat(80);
    expect(getNodeDimensions("concept", label).width).toBeLessThanOrEqual(260);
    expect(getNodeDimensions("topic", label).width).toBeLessThanOrEqual(220);
    expect(getNodeDimensions("subtopic", label).width).toBeLessThanOrEqual(180);
    expect(getNodeDimensions("note", label).width).toBeLessThanOrEqual(160);
  });

  it("grows taller once a capped label wraps", () => {
    const oneLine = getNodeDimensions("topic", "CPU");
    const wrapped = getNodeDimensions("topic", "x".repeat(80));
    expect(wrapped.height).toBeGreaterThan(oneLine.height);
  });

  it("caps height at the component's line-clamp", () => {
    // note is line-clamp-2: 18px chrome + 2 * 16px line height.
    expect(getNodeDimensions("note", "x".repeat(500)).height).toBe(50);
  });

  it("treats an unknown type as a topic, and input as a concept", () => {
    expect(getNodeDimensions("mystery")).toEqual(getNodeDimensions("topic"));
    expect(getNodeDimensions("input")).toEqual(getNodeDimensions("concept"));
  });
});

describe("layeredRanks", () => {
  it("puts nodes with no incoming edge at rank 0", () => {
    const ranks = layeredRanks(
      ["a", "b", "c"],
      [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
      ],
    );
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(1);
  });

  it("ranks a node below its deepest parent (longest path)", () => {
    const ranks = layeredRanks(
      ["a", "b", "c"],
      [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "a", target: "c" },
      ],
    );
    expect(ranks.get("c")).toBe(2);
  });

  it("leaves nodes in a cycle unranked", () => {
    const ranks = layeredRanks(
      ["a", "b"],
      [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    );
    expect(ranks.size).toBe(0);
  });

  it("ignores edges referencing unknown nodes", () => {
    const ranks = layeredRanks(["a"], [{ source: "ghost", target: "a" }]);
    expect(ranks.get("a")).toBe(0);
  });
});

describe("applyLayeredLayout", () => {
  const edges = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
  ];

  it("stacks ranks top to bottom", () => {
    const nodes = [node("a", "concept"), node("b"), node("c")];
    const out = applyLayeredLayout(nodes, edges, layeredRanks(["a", "b", "c"], edges));

    const byId = new Map(out.map((n) => [n.id, n.position]));
    const conceptHeight = getNodeDimensions("concept").height;
    expect(byId.get("a")!.y).toBe(0);
    expect(byId.get("b")!.y).toBe(conceptHeight + 100);
    expect(byId.get("c")!.y).toBe(conceptHeight + 100);
  });

  it("centres each row on x=0 and spaces siblings apart", () => {
    const nodes = [node("a", "concept"), node("b"), node("c")];
    const out = applyLayeredLayout(nodes, edges, layeredRanks(["a", "b", "c"], edges));
    const byId = new Map(out.map((n) => [n.id, n.position]));

    const conceptWidth = getNodeDimensions("concept").width;
    const topicWidth = getNodeDimensions("topic").width;
    expect(byId.get("a")!.x).toBe(-conceptWidth / 2);

    const rowWidth = topicWidth * 2 + 150;
    expect(byId.get("b")!.x).toBe(-rowWidth / 2);
    expect(byId.get("c")!.x).toBe(-rowWidth / 2 + topicWidth + 150);
  });

  it("reserves room for a long label so siblings do not overlap", () => {
    const longLabel = "Instruction level parallelism and speculative execution";
    const nodes = [
      node("a", "concept"),
      node("b", "topic", longLabel),
      node("c", "topic", "IO"),
    ];
    const out = applyLayeredLayout(nodes, edges, layeredRanks(["a", "b", "c"], edges));
    const byId = new Map(out.map((n) => [n.id, n.position]));

    const gap = byId.get("c")!.x - byId.get("b")!.x;
    expect(gap).toBeGreaterThanOrEqual(
      getNodeDimensions("topic", longLabel).width,
    );
  });

  it("parks unranked nodes in a trailing row", () => {
    const nodes = [node("a", "concept"), node("b"), node("orphan")];
    const out = applyLayeredLayout(nodes, edges, layeredRanks(["a", "b"], edges));
    const byId = new Map(out.map((n) => [n.id, n.position]));

    expect(byId.get("orphan")!.y).toBeGreaterThan(byId.get("b")!.y);
  });

  it("is deterministic for the same input", () => {
    const nodes = [node("a", "concept"), node("b"), node("c")];
    const ranks = layeredRanks(["a", "b", "c"], edges);
    expect(applyLayeredLayout(nodes, edges, ranks)).toEqual(
      applyLayeredLayout(nodes, edges, ranks),
    );
  });

  it("returns an empty list untouched", () => {
    expect(applyLayeredLayout([], edges, new Map())).toEqual([]);
  });
});

describe("buildDiagramData", () => {
  it("returns undefined when there are no labels", () => {
    expect(buildDiagramData([], [])).toBeUndefined();
    expect(buildDiagramData(["  "], [])).toBeUndefined();
  });

  it("falls back to the grid when the model omits edges", () => {
    const data = buildDiagramData(["Root", "One", "Two"], [])!;
    expect(data.edges).toEqual([]);
    expect(data.nodes[0].position).toEqual({ x: 400, y: 50 });
  });

  it("lays out a mind map with the root on top", () => {
    const data = buildDiagramData(
      ["Root", "Branch A", "Branch B", "Leaf"],
      ["0-1", "0-2", "1-3"],
    )!;

    expect(data.nodes).toHaveLength(4);
    expect(data.nodes[0].type).toBe("concept");
    expect(data.nodes[1].type).toBe("topic");
    expect(data.nodes[3].type).toBe("subtopic");

    const y = data.nodes.map((n) => n.position.y);
    expect(y[0]).toBeLessThan(y[1]);
    expect(y[1]).toBe(y[2]);
    expect(y[1]).toBeLessThan(y[3]);
  });

  it("ranks by BFS depth, not longest path", () => {
    // Leaf 3 is reachable from the root both directly and via node 1, so BFS
    // depth puts it one row down rather than two.
    const data = buildDiagramData(
      ["Root", "Mid", "Leaf"],
      ["0-1", "1-2", "0-2"],
    )!;
    const y = data.nodes.map((n) => n.position.y);
    expect(y[2]).toBe(y[1]);
  });

  it("accepts object node inputs mixed with bare strings", () => {
    const data = buildDiagramData(
      ["Root", { label: "Branch" }, "  ", { label: "   " }, { label: "Leaf" }],
      ["0-1", "1-2"],
    )!;
    expect(data.nodes.map((n) => n.data.label)).toEqual([
      "Root",
      "Branch",
      "Leaf",
    ]);
  });

  it("indexes edges against post-filter positions", () => {
    const data = buildDiagramData(["Root", "", "Leaf"], ["0-1"])!;
    expect(data.nodes).toHaveLength(2);
    expect(data.edges).toHaveLength(1);
    expect(data.nodes[1].data.label).toBe("Leaf");
  });
});

describe("parseDiagramEdge", () => {
  it("parses the bare form without a label", () => {
    expect(parseDiagramEdge("0-1")).toEqual({ source: 0, target: 1 });
    expect(parseDiagramEdge("  2-10  ")).toEqual({ source: 2, target: 10 });
  });

  it("parses a labelled edge and trims the label", () => {
    expect(parseDiagramEdge("0-1: causes")).toEqual({
      source: 0,
      target: 1,
      label: "causes",
    });
    expect(parseDiagramEdge("0-1:leads to, eventually")).toEqual({
      source: 0,
      target: 1,
      label: "leads to, eventually",
    });
  });

  it("drops an empty label", () => {
    expect(parseDiagramEdge("0-1:")).toEqual({ source: 0, target: 1 });
    expect(parseDiagramEdge("0-1:    ")).toEqual({ source: 0, target: 1 });
  });

  it("caps a long label with an ellipsis", () => {
    const label = parseDiagramEdge(`0-1: ${"x".repeat(60)}`)!.label!;
    expect(label).toHaveLength(40);
    expect(label.endsWith("…")).toBe(true);
  });

  it("rejects malformed pairs and multi-line labels", () => {
    expect(parseDiagramEdge("a-b")).toBeNull();
    expect(parseDiagramEdge("-1-2")).toBeNull();
    expect(parseDiagramEdge("0")).toBeNull();
    expect(parseDiagramEdge("0-1: causes\nmore")).toBeNull();
  });
});

describe("edge labels", () => {
  it("carries the label onto the built edge", () => {
    const data = buildDiagramData(
      ["Root", "Leaf"],
      ["0-1: causes"],
    )!;
    expect(data.edges[0].label).toBe("causes");
  });

  it("omits the label for a bare edge", () => {
    const data = buildDiagramData(["Root", "Leaf"], ["0-1"])!;
    expect(data.edges[0].label).toBeUndefined();
  });

  it("preserves semantic direction when layout swaps a child-to-root edge", () => {
    // Layout uses a root-to-child copy, but the returned edge must still say
    // that the child explains the root.
    const data = buildDiagramData(
      ["Root", "Branch", "Leaf"],
      ["0-1", "2-0: explains"],
    )!;
    const directional = data.edges.find((e) => e.label === "explains")!;
    expect(directional.source).toBe("2");
    expect(directional.target).toBe("0");
  });
});

describe("node kinds", () => {
  it("lets a declared kind win over the depth fallback", () => {
    const data = buildDiagramData(
      ["Root", { label: "Branch", kind: "note" }, "Leaf"],
      ["0-1", "1-2"],
    )!;
    expect(data.nodes[1].type).toBe("note");
    expect(data.nodes[1].data.color).toBe(
      "bg-gradient-to-br from-amber-400 to-orange-400",
    );
  });

  it("falls back when the kind is absent, unknown or not a string", () => {
    const data = buildDiagramData(
      [
        "Root",
        { label: "Branch", kind: "mystery" },
        { label: "Leaf", kind: 7 },
      ],
      ["0-1", "1-2"],
    )!;
    expect(data.nodes[1].type).toBe("topic");
    expect(data.nodes[2].type).toBe("subtopic");
  });

  it("forces index 0 to concept even when it declares otherwise", () => {
    const data = buildDiagramData(
      [{ label: "Root", kind: "note" }, "Leaf"],
      ["0-1"],
    )!;
    expect(data.nodes[0].type).toBe("concept");
    expect(data.nodes[0].data.color).toBe(
      "bg-gradient-to-br from-purple-500 to-pink-500",
    );
  });

  it("demotes any other declared concept so there is exactly one", () => {
    const data = buildDiagramData(
      ["Root", { label: "Branch", kind: "concept" }, { label: "Leaf", kind: "concept" }],
      ["0-1", "1-2"],
    )!;
    expect(data.nodes.filter((n) => n.type === "concept")).toHaveLength(1);
    expect(data.nodes[1].type).toBe("topic");
    expect(data.nodes[2].type).toBe("topic");
  });

  it("applies declared kinds in the edgeless grid fallback too", () => {
    const data = buildDiagramData(
      ["Root", { label: "One", kind: "note" }, "Two"],
      [],
    )!;
    expect(data.nodes[1].type).toBe("note");
    expect(data.nodes[2].type).toBe("topic");
  });
});
