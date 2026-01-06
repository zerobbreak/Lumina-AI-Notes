import { Node, Edge } from "@xyflow/react";

export type NodeType =
  | "concept"
  | "topic"
  | "subtopic"
  | "note"
  | "default"
  | "input";

export interface MindMapNode extends Node {
  type?: NodeType;
  data: {
    label: string;
    color?: string;
    description?: string;
  };
}

export interface MindMapEdge extends Edge {
  label?: string;
  animated?: boolean;
}

export type LayoutType = "hierarchical" | "radial" | "force";

export interface LayoutOptions {
  direction?: "TB" | "LR" | "BT" | "RL"; // Top-Bottom, Left-Right, etc.
  nodeSpacing?: number;
  rankSpacing?: number;
}

export interface ExportOptions {
  format: "png" | "svg" | "pdf";
  fileName?: string;
  backgroundColor?: string;
  quality?: number;
}
