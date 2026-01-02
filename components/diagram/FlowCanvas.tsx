"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

interface FlowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  className?: string;
  isReadOnly?: boolean;
}

function FlowCanvasInner({
  initialNodes = [],
  initialEdges = [],
  onChange,
  className,
  isReadOnly = false,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync changes back to parent - use queueMicrotask to avoid flushSync error
  useEffect(() => {
    if (onChange) {
      queueMicrotask(() => {
        onChange({ nodes, edges });
      });
    }
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div
      className={cn(
        "w-full h-[500px] border rounded-lg bg-slate-950",
        className
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        fitView
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable={!isReadOnly}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={12} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
