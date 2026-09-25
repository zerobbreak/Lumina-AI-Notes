import { describe, expect, it } from "vitest";
import { graphNodeSize, layoutGraph, type LayoutNode } from "@/lib/studio/graphLayout";

const node = (id: string, connections = 0): LayoutNode => ({ id, size: graphNodeSize(connections) });

const centre = (pos: Map<string, { x: number; y: number }>, n: LayoutNode) => {
  const p = pos.get(n.id)!;
  return { x: p.x + n.size / 2, y: p.y + n.size / 2 };
};

describe("studio graph layout", () => {
  it("spreads unlinked notes out instead of stacking them", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const pos = layoutGraph(nodes, []);
    const points = nodes.map((n) => centre(pos, n));
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThan(150);
      }
    }
  });

  it("keeps every pair of nodes clear of each other's labels", () => {
    const nodes = Array.from({ length: 30 }, (_, i) => node(`n${i}`, i % 4));
    const edges = nodes.slice(1).map((n, i) => ({ source: nodes[i % 5].id, target: n.id }));
    const pos = layoutGraph(nodes, edges);
    const points = nodes.map((n) => centre(pos, n));
    let closest = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        closest = Math.min(closest, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
      }
    }
    expect(closest).toBeGreaterThan(140);
  });

  it("puts linked notes closer together than unlinked ones", () => {
    const nodes = [node("a", 1), node("b", 1), node("c"), node("d")];
    const pos = layoutGraph(nodes, [{ source: "a", target: "b" }]);
    const [a, b, c, d] = nodes.map((n) => centre(pos, n));
    const linked = Math.hypot(a.x - b.x, a.y - b.y);
    const unlinked = Math.min(Math.hypot(a.x - c.x, a.y - c.y), Math.hypot(c.x - d.x, c.y - d.y));
    expect(linked).toBeLessThan(unlinked);
  });

  it("is deterministic and ignores edges to unknown notes", () => {
    const nodes = [node("a", 1), node("b", 1), node("c")];
    const edges = [{ source: "a", target: "b" }, { source: "a", target: "missing" }];
    expect(layoutGraph(nodes, edges)).toEqual(layoutGraph(nodes, edges));
    expect(layoutGraph([], edges).size).toBe(0);
  });
});
