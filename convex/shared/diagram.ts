/**
 * Shared diagram-building utilities for converting simplified
 * node/edge labels into ReactFlow-compatible data structures.
 */

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

/**
 * Build a ReactFlow-compatible diagram from simplified node labels and
 * edge strings (format: "sourceIndex-targetIndex").
 */
export const buildDiagramData = (
  nodeLabels: string[],
  edgeStrings: string[],
): DiagramData | undefined => {
  if (nodeLabels.length === 0) return undefined;

  const nodes: DiagramNode[] = nodeLabels.map((label, index) => {
    let type = "default";
    let color = "bg-gradient-to-br from-gray-500 to-gray-600";

    if (index === 0) {
      type = "concept";
      color = "bg-gradient-to-br from-purple-500 to-pink-500";
    } else if (index <= 3) {
      type = "topic";
      color = "bg-gradient-to-br from-blue-500 to-cyan-500";
    } else if (index <= 6) {
      type = "subtopic";
      color = "bg-gradient-to-br from-emerald-500 to-teal-500";
    } else {
      type = "note";
      color = "bg-gradient-to-br from-amber-400 to-orange-400";
    }

    return {
      id: String(index),
      type,
      data: { label, color },
      position: {
        x: index === 0 ? 400 : 200 + (index % 3) * 200,
        y: index === 0 ? 50 : Math.floor(index / 3) * 150 + 200,
      },
    };
  });

  const edges: DiagramEdge[] = edgeStrings.map((edge, index) => {
    const [source, target] = edge.split("-");
    return { id: `e${index}`, source, target, animated: true };
  });

  return { nodes, edges };
};
