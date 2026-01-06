import dagre from "dagre";
import { Node, Edge } from "@xyflow/react";
import { LayoutType, LayoutOptions } from "./types";

/**
 * Apply hierarchical layout using Dagre
 */
export function applyHierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] {
  const {
    direction = "TB",
    nodeSpacing = 150,
    rankSpacing = 100,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
  });

  // Add nodes to dagre
  nodes.forEach((node) => {
    const width = getNodeWidth(node.type);
    const height = getNodeHeight(node.type);
    dagreGraph.setNode(node.id, { width, height });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Update node positions
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });
}

/**
 * Apply radial layout (circular from center)
 */
export function applyRadialLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Find the root node (node with type "input" or "concept", or first node)
  const rootNode =
    nodes.find((n) => n.type === "input" || n.type === "concept") || nodes[0];

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  });

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = [
    { id: rootNode.id, level: 0 },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    const children = adjacency.get(id) || [];
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Assign unvisited nodes to level 1
  nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 1);
    }
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Position nodes in circles
  const centerX = 400;
  const centerY = 300;
  const radiusIncrement = 200;

  return nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const nodesInLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesInLevel.findIndex((n) => n.id === node.id);
    const totalInLevel = nodesInLevel.length;

    if (level === 0) {
      // Center node
      return {
        ...node,
        position: { x: centerX, y: centerY },
      };
    }

    // Calculate angle for this node
    const angle = (2 * Math.PI * indexInLevel) / totalInLevel - Math.PI / 2;
    const radius = level * radiusIncrement;

    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });
}

/**
 * Apply force-directed layout (simple physics-based)
 */
export function applyForceLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Initialize positions if not set
  const positionedNodes = nodes.map((node, index) => ({
    ...node,
    position: node.position || {
      x: 400 + Math.random() * 200 - 100,
      y: 300 + Math.random() * 200 - 100,
    },
  }));

  // Simple force-directed algorithm
  const iterations = 50;
  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const centeringForce = 0.01;

  // Build edge map
  const edgeMap = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!edgeMap.has(edge.source)) {
      edgeMap.set(edge.source, new Set());
    }
    if (!edgeMap.has(edge.target)) {
      edgeMap.set(edge.target, new Set());
    }
    edgeMap.get(edge.source)!.add(edge.target);
    edgeMap.get(edge.target)!.add(edge.source);
  });

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();

    // Initialize forces
    positionedNodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0 });
    });

    // Repulsion between all nodes
    for (let i = 0; i < positionedNodes.length; i++) {
      for (let j = i + 1; j < positionedNodes.length; j++) {
        const nodeA = positionedNodes[i];
        const nodeB = positionedNodes[j];

        const dx = nodeB.position.x - nodeA.position.x;
        const dy = nodeB.position.y - nodeA.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = repulsionStrength / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        const forceA = forces.get(nodeA.id)!;
        const forceB = forces.get(nodeB.id)!;

        forceA.x -= fx;
        forceA.y -= fy;
        forceB.x += fx;
        forceB.y += fy;
      }
    }

    // Attraction along edges
    edges.forEach((edge) => {
      const sourceNode = positionedNodes.find((n) => n.id === edge.source);
      const targetNode = positionedNodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = distance * attractionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        const forceSource = forces.get(sourceNode.id)!;
        const forceTarget = forces.get(targetNode.id)!;

        forceSource.x += fx;
        forceSource.y += fy;
        forceTarget.x -= fx;
        forceTarget.y -= fy;
      }
    });

    // Centering force
    const centerX = 400;
    const centerY = 300;
    positionedNodes.forEach((node) => {
      const force = forces.get(node.id)!;
      force.x += (centerX - node.position.x) * centeringForce;
      force.y += (centerY - node.position.y) * centeringForce;
    });

    // Apply forces
    positionedNodes.forEach((node) => {
      const force = forces.get(node.id)!;
      node.position.x += force.x;
      node.position.y += force.y;
    });
  }

  return positionedNodes;
}

/**
 * Get estimated node width based on type
 */
function getNodeWidth(type?: string): number {
  switch (type) {
    case "concept":
    case "input":
      return 200;
    case "topic":
      return 160;
    case "subtopic":
      return 120;
    case "note":
      return 100;
    default:
      return 150;
  }
}

/**
 * Get estimated node height based on type
 */
function getNodeHeight(type?: string): number {
  switch (type) {
    case "concept":
    case "input":
      return 80;
    case "topic":
      return 60;
    case "subtopic":
      return 50;
    case "note":
      return 40;
    default:
      return 60;
  }
}



