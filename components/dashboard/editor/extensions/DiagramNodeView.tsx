"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { FlowCanvas } from "@/components/diagram/FlowCanvas";
import { useCallback } from "react";
import { Node, Edge } from "@xyflow/react";

export const DiagramNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, extension } = props;

  const handleCanvasChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      updateAttributes({
        nodes,
        edges,
      });
    },
    [updateAttributes]
  );

  const isReadOnly = !props.editor.isEditable;

  return (
    <NodeViewWrapper className="my-8">
      <div className="relative border rounded-lg overflow-hidden shadow-xs border-slate-200 dark:border-slate-800">
        <div className="absolute top-2 right-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Diagram
        </div>
        <FlowCanvas
          initialNodes={node.attrs.nodes}
          initialEdges={node.attrs.edges}
          onChange={handleCanvasChange}
          isReadOnly={isReadOnly}
        />
      </div>
    </NodeViewWrapper>
  );
};
