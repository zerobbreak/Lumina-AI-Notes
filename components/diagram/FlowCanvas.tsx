"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { MindMapToolbar } from "./MindMapToolbar";
import { ConceptNode } from "./nodes/ConceptNode";
import { TopicNode } from "./nodes/TopicNode";
import { SubtopicNode } from "./nodes/SubtopicNode";
import { NoteNode } from "./nodes/NoteNode";
import {
  applyHierarchicalLayout,
  applyRadialLayout,
  applyForceLayout,
} from "./layouts";
import { exportToPNG, exportToPDF, exportToSVG } from "./export";
import { NodeType, LayoutType } from "@/types";
import { toast } from "sonner";

interface FlowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  className?: string;
  isReadOnly?: boolean;
}

// Custom node types
const nodeTypes = {
  concept: ConceptNode,
  topic: TopicNode,
  subtopic: SubtopicNode,
  note: NoteNode,
};

function FlowCanvasInner({
  initialNodes = [],
  initialEdges = [],
  onChange,
  className,
  isReadOnly = false,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, getNodes, getEdges } = useReactFlow();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // Sync changes back to parent - use queueMicrotask to avoid flushSync error
  useEffect(() => {
    if (onChange) {
      queueMicrotask(() => {
        onChange({ nodes, edges });
      });
    }
  }, [nodes, edges, onChange]);

  // Track selected nodes
  useEffect(() => {
    const selected = nodes.filter((n) => n.selected).map((n) => n.id);
    setSelectedNodes(selected);
  }, [nodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Add new node
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position: { x: 250, y: 250 },
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          onLabelChange: (newLabel: string) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === newNode.id
                  ? { ...node, data: { ...node.data, label: newLabel } }
                  : node
              )
            );
          },
        },
      };
      setNodes((nds) => [...nds, newNode]);
      toast.success(`${type} node added`);
    },
    [setNodes]
  );

  // Delete selected nodes and edges
  const handleDeleteSelected = useCallback(() => {
    const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
    const selectedEdgeIds = edges.filter((e) => e.selected).map((e) => e.id);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      return;
    }

    setNodes((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedEdgeIds.includes(e.id) &&
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target)
      )
    );

    toast.success(
      `Deleted ${selectedNodeIds.length} node(s) and ${selectedEdgeIds.length} edge(s)`
    );
  }, [nodes, edges, setNodes, setEdges]);

  // Apply layout
  const handleApplyLayout = useCallback(
    (layout: LayoutType) => {
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      let layoutedNodes: Node[];

      switch (layout) {
        case "hierarchical":
          layoutedNodes = applyHierarchicalLayout(currentNodes, currentEdges);
          break;
        case "radial":
          layoutedNodes = applyRadialLayout(currentNodes, currentEdges);
          break;
        case "force":
          layoutedNodes = applyForceLayout(currentNodes, currentEdges);
          break;
        default:
          layoutedNodes = currentNodes;
      }

      setNodes(layoutedNodes);
      setTimeout(() => fitView({ duration: 300 }), 50);
      toast.success(`${layout} layout applied`);
    },
    [getNodes, getEdges, setNodes, fitView]
  );

  // Export diagram
  const handleExport = useCallback(async (format: "png" | "svg" | "pdf") => {
    if (!reactFlowWrapper.current) return;

    const element = reactFlowWrapper.current.querySelector(
      ".react-flow__viewport"
    ) as HTMLElement;

    if (!element) return;

    try {
      toast.loading(`Exporting as ${format.toUpperCase()}...`);

      switch (format) {
        case "png":
          await exportToPNG(element, { format: "png" });
          break;
        case "svg":
          await exportToSVG(element, { format: "svg" });
          break;
        case "pdf":
          await exportToPDF(element, { format: "pdf" });
          break;
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    }
  }, []);

  // Change color of selected nodes
  const handleColorChange = useCallback(
    (color: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.selected ? { ...node, data: { ...node.data, color } } : node
        )
      );
      toast.success("Color updated");
    },
    [setNodes]
  );

  // Fit view
  const handleFitView = useCallback(() => {
    fitView({ duration: 300, padding: 0.2 });
  }, [fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isReadOnly) return;

      // Delete selected
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        // Don't delete if user is editing text
        if (
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          return;
        }
        event.preventDefault();
        handleDeleteSelected();
      }

      // Add node with 'N' key
      if (event.key === "n" || event.key === "N") {
        const target = event.target as HTMLElement;
        if (
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          return;
        }
        event.preventDefault();
        handleAddNode("topic");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadOnly, handleDeleteSelected, handleAddNode]);

  // Update node data with label change handler
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onLabelChange: (newLabel: string) => {
            setNodes((innerNds) =>
              innerNds.map((n) =>
                n.id === node.id
                  ? { ...n, data: { ...n.data, label: newLabel } }
                  : n
              )
            );
          },
        },
      }))
    );
  }, []);

  return (
    <div
      ref={reactFlowWrapper}
      className={cn(
        "w-full h-[500px] border rounded-lg bg-slate-950 relative",
        className
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable={!isReadOnly}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#60a5fa", strokeWidth: 2 },
        }}
      >
        <Background gap={12} size={1} color="#333" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "concept":
                return "#a855f7";
              case "topic":
                return "#3b82f6";
              case "subtopic":
                return "#10b981";
              case "note":
                return "#f59e0b";
              default:
                return "#6b7280";
            }
          }}
          className="bg-[#18181B] border border-white/10"
        />
      </ReactFlow>

      <MindMapToolbar
        onAddNode={handleAddNode}
        onDeleteSelected={handleDeleteSelected}
        onApplyLayout={handleApplyLayout}
        onExport={handleExport}
        onFitView={handleFitView}
        onColorChange={handleColorChange}
        hasSelection={selectedNodes.length > 0}
        isReadOnly={isReadOnly}
      />
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
