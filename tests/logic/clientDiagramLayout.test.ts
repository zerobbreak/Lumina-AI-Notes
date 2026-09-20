import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import {
  applyHierarchicalLayout,
  mergeLayoutPositions,
} from "../../components/diagram/layouts";

function node(
  id: string,
  position = { x: 0, y: 0 },
  label = id,
): Node {
  return { id, position, data: { label } };
}

describe("client hierarchical layout", () => {
  it("ignores dangling edges instead of rejecting the entire layout", async () => {
    const nodes = [node("root"), node("child")];
    const edges: Edge[] = [
      { id: "valid", source: "root", target: "child" },
      { id: "dangling", source: "root", target: "deleted" },
    ];

    await expect(
      applyHierarchicalLayout(nodes, edges),
    ).resolves.toHaveLength(2);
  });

  it("merges positions into current state without restoring stale nodes", () => {
    const layouted = [
      node("root", { x: 100, y: 200 }, "old root"),
      node("deleted", { x: 300, y: 400 }),
    ];
    const latest = [
      node("root", { x: 5, y: 6 }, "renamed root"),
      node("new", { x: 7, y: 8 }),
    ];

    const merged = mergeLayoutPositions(latest, layouted);

    expect(merged.map(({ id }) => id)).toEqual(["root", "new"]);
    expect(merged[0].position).toEqual({ x: 100, y: 200 });
    expect(merged[0].data.label).toBe("renamed root");
    expect(merged[1]).toEqual(latest[1]);
  });
});
