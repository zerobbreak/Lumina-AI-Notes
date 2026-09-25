"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  useNodesInitialized,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
  type FitViewOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, Workflow, Sparkles } from "lucide-react";

import type { KnowledgeGraphDto } from "@/types/api/knowledgeGraph";
import { cn } from "@/lib/utils";
import { graphNodeSize, layoutGraph } from "@/lib/studio/graphLayout";

/** Index 0 is the neutral/orphan color; real clusters start at 1. */
const CLUSTER_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "#a649df", "#0ea5e9", "#f59e0b", "#22c55e"];

export function clusterColor(cluster: number, clusterByTopic = true) {
  return clusterByTopic && cluster > 0 ? CLUSTER_COLORS[cluster % CLUSTER_COLORS.length] : CLUSTER_COLORS[0];
}

interface GraphNodeData {
  title: string;
  connectionCount: number;
  orphan: boolean;
  selected: boolean;
  dimmed: boolean;
  clusterColor: string;
  [key: string]: unknown;
}

function GraphNodeView({ data }: NodeProps) {
  const d = data as unknown as GraphNodeData;
  const size = graphNodeSize(d.connectionCount);

  return (
    <div
      style={{ position: "relative", width: size, height: size, opacity: d.dimmed ? 0.3 : 1 }}
      className="transition-opacity"
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div
        title={d.title}
        className="cursor-pointer transition-transform hover:scale-110"
        style={{
          width: size,
          height: size,
          borderRadius: 9999,
          background: d.orphan
            ? "hsl(var(--muted))"
            : `color-mix(in srgb, ${d.clusterColor} 15%, transparent)`,
          border: `2px ${d.orphan ? "dashed" : "solid"} ${
            d.orphan ? "hsl(var(--muted-foreground))" : d.clusterColor
          }`,
          boxShadow: d.selected
            ? `0 0 0 3px hsl(var(--card)), 0 0 0 5px ${d.clusterColor}`
            : "none",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-[130px] -translate-x-1/2 text-center">
        <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
          {d.title}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = { graphNode: GraphNodeView };

/**
 * Fits the whole map on screen once its nodes are measured, and again when
 * the set of notes changes. React Flow's own `fitView` only fires once and
 * can miss when measuring is slow, which left the map sitting at the origin.
 */
function FitOnLayout({ layoutKey, options }: { layoutKey: string; options: FitViewOptions }) {
  const { fitView } = useReactFlow();
  const measured = useNodesInitialized();
  useEffect(() => {
    if (!layoutKey || !measured) return;
    void fitView(options);
    // Refit on a new layout only, not on every render's fresh options object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, measured, fitView]);
  return null;
}

/** Pans the canvas to a note when asked; must live inside the provider. */
function FocusOnNode({ focus }: { focus: { id: string; nonce: number } | null }) {
  const { fitView } = useReactFlow();
  const measured = useNodesInitialized();
  useEffect(() => {
    if (!focus || !measured) return;
    void fitView({ nodes: [{ id: focus.id }], duration: 400, maxZoom: 1.2, padding: 0.8 });
  }, [focus, measured, fitView]);
  return null;
}

interface KnowledgeGraphProps {
  graph: KnowledgeGraphDto | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** When set (with a selection), nodes outside it are dimmed. */
  highlightIds?: Set<string> | null;
  /** Centre the canvas on this note; bump `nonce` to re-centre. */
  focus?: { id: string; nonce: number } | null;
  /** Pixels on the right covered by an overlay (the chat dock); fitting keeps clear of them. */
  reservedRight?: number;
}

/** Full-bleed note graph with a floating toolbar and legend. */
export function KnowledgeGraph({
  graph,
  selectedId,
  onSelect,
  highlightIds,
  focus = null,
  reservedRight = 0,
}: KnowledgeGraphProps) {
  const [clusterByTopic, setClusterByTopic] = useState(true);
  const [search, setSearch] = useState("");

  const laidOutNodes = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return [] as Node[];

    const positions = layoutGraph(
      graph.nodes.map((n) => ({ id: n.id, size: graphNodeSize(n.connectionCount) })),
      graph.edges,
    );
    return graph.nodes.map<Node>((n) => ({
      id: n.id,
      type: "graphNode",
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: { title: n.title, connectionCount: n.connectionCount },
    }));
    // Re-run layout only when the underlying node/edge set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph?.nodes.length, graph?.edges.length]);

  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.id, n])),
    [graph],
  );

  const searchLower = search.trim().toLowerCase();
  const dimOthers = Boolean(selectedId && highlightIds && highlightIds.size > 0);

  const displayNodes = useMemo(() => {
    return laidOutNodes.map((n) => {
      const meta = nodeById.get(n.id);
      if (!meta) return n;
      const matches = !searchLower || meta.title.toLowerCase().includes(searchLower);
      return {
        ...n,
        hidden: !matches,
        data: {
          title: meta.title,
          connectionCount: meta.connectionCount,
          orphan: meta.orphan,
          selected: n.id === selectedId,
          dimmed: dimOthers && !highlightIds!.has(n.id),
          clusterColor: clusterColor(meta.cluster, clusterByTopic),
        },
      };
    });
  }, [laidOutNodes, nodeById, clusterByTopic, selectedId, searchLower, dimOthers, highlightIds]);

  const displayEdges = useMemo<Edge[]>(() => {
    return (graph?.edges ?? []).map((e) => {
      const inHood = !dimOthers || (highlightIds!.has(e.source) && highlightIds!.has(e.target));
      return {
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "straight",
        style: {
          ...(e.type === "wikilink"
            ? { stroke: "hsl(var(--primary))", strokeWidth: 2 }
            : { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5, strokeDasharray: "5 5" }),
          opacity: inHood ? 1 : 0.15,
        },
      };
    });
  }, [graph, dimOthers, highlightIds]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => onSelect(node.id === selectedId ? null : node.id),
    [onSelect, selectedId],
  );

  const clusters = useMemo(
    () => [...new Set((graph?.nodes ?? []).map((n) => n.cluster).filter((c) => c > 0))].sort((a, b) => a - b),
    [graph],
  );

  const toolbar = graph && graph.nodes.length > 0 && (
    <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-2xl border bg-background/90 p-1.5 shadow-sm backdrop-blur">
      <div className="flex h-8 min-w-[180px] items-center gap-2 rounded-full border border-border bg-muted/50 px-3">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <button
        type="button"
        onClick={() => setClusterByTopic((v) => !v)}
        aria-pressed={clusterByTopic}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
          clusterByTopic
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted/50 text-muted-foreground",
        )}
      >
        <Workflow className="h-3.5 w-3.5" />
        Cluster by topic
      </button>
    </div>
  );

  if (graph === undefined || graph.nodes.length === 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center text-muted-foreground">
        {toolbar}
        {graph === undefined ? (
          <div className="flex animate-pulse items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span>Mapping your notes…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Workflow className="h-8 w-8" />
            <p className="text-sm">Write a few notes and they&apos;ll start showing up here, linked.</p>
          </div>
        )}
      </div>
    );
  }

  const layoutKey = laidOutNodes.map((n) => n.id).join(",");
  const fitOptions: FitViewOptions = {
    maxZoom: 1.1,
    padding: { top: "72px", bottom: "72px", left: "48px", right: `${reservedRight + 48}px` },
  };
  const orphanCount = graph.nodes.filter((n) => n.orphan).length;

  return (
    <div className="relative h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => onSelect(null)}
          fitView
          fitViewOptions={fitOptions}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} />
          <Controls showInteractive={false} position="bottom-left" />
          {/* Before FocusOnNode, so a requested focus wins over the fit. */}
          <FitOnLayout layoutKey={layoutKey} options={fitOptions} />
          <FocusOnNode focus={focus} />
        </ReactFlow>
      </ReactFlowProvider>

      {toolbar}

      {/* Legend, beside the zoom controls */}
      <div className="pointer-events-none absolute bottom-3 left-14 z-10 max-w-[calc(100%-5rem)] rounded-xl border bg-background/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        {clusterByTopic && clusters.length > 0 && (
          <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {clusters.slice(0, 6).map((c) => (
              <span key={c} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: clusterColor(c) }} />
                Topic {c}
              </span>
            ))}
            {orphanCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
                Unlinked
              </span>
            )}
          </div>
        )}
        <p>
          {graph.nodes.length} notes · solid: linked · dashed: similar
        </p>
      </div>
    </div>
  );
}
