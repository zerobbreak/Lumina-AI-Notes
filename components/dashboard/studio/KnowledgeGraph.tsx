"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery } from "convex/react";
import { Search, Workflow, Sparkles } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { applyForceLayout } from "@/components/diagram/layouts";

/** Index 0 is the neutral/orphan color; real clusters start at 1. */
const CLUSTER_COLORS = ["#9a99a3", "#6366f1", "#a649df", "#0ea5e9", "#f59e0b", "#22c55e"];

interface GraphNodeData {
  title: string;
  connectionCount: number;
  orphan: boolean;
  selected: boolean;
  clusterColor: string;
  [key: string]: unknown;
}

function GraphNodeView({ data }: NodeProps) {
  const d = data as unknown as GraphNodeData;
  const size = Math.min(76, 32 + d.connectionCount * 8);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div
        title={d.title}
        className="cursor-pointer transition-transform hover:scale-110"
        style={{
          width: size,
          height: size,
          borderRadius: 9999,
          background: d.orphan ? "var(--muted)" : `${d.clusterColor}26`,
          border: `2px ${d.orphan ? "dashed" : "solid"} ${
            d.orphan ? "var(--muted-foreground)" : d.clusterColor
          }`,
          boxShadow: d.selected
            ? `0 0 0 3px var(--card), 0 0 0 5px ${d.clusterColor}`
            : "none",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-[130px] -translate-x-1/2 text-center"
      >
        <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
          {d.title}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = { graphNode: GraphNodeView };

interface KnowledgeGraphProps {
  onOpenNote: (noteId: Id<"notes">) => void;
  /** Hands the selected note plus its linked/related neighbors to the chat. */
  onDiscussInChat: (noteIds: Id<"notes">[]) => void;
}

export function KnowledgeGraph({ onOpenNote, onDiscussInChat }: KnowledgeGraphProps) {
  const graph = useQuery(api.knowledgeGraph.getGraph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clusterByTopic, setClusterByTopic] = useState(true);
  const [search, setSearch] = useState("");

  const laidOutNodes = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return [] as Node[];

    const rfNodes: Node[] = graph.nodes.map((n) => ({
      id: n.id,
      type: "graphNode",
      position: { x: 0, y: 0 },
      data: { title: n.title, connectionCount: n.connectionCount },
    }));
    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
    }));
    return applyForceLayout(rfNodes, rfEdges);
    // Re-run layout only when the underlying node/edge set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph?.nodes.length, graph?.edges.length]);

  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.id, n])),
    [graph],
  );

  const searchLower = search.trim().toLowerCase();

  const displayNodes = useMemo(() => {
    return laidOutNodes.map((n) => {
      const meta = nodeById.get(n.id);
      if (!meta) return n;
      const clusterColor =
        clusterByTopic && meta.cluster > 0
          ? CLUSTER_COLORS[meta.cluster % CLUSTER_COLORS.length]
          : CLUSTER_COLORS[0];
      const matches = !searchLower || meta.title.toLowerCase().includes(searchLower);
      return {
        ...n,
        hidden: !matches,
        data: {
          title: meta.title,
          connectionCount: meta.connectionCount,
          orphan: meta.orphan,
          selected: n.id === selectedId,
          clusterColor,
        },
      };
    });
  }, [laidOutNodes, nodeById, clusterByTopic, selectedId, searchLower]);

  const displayEdges = useMemo<Edge[]>(() => {
    return (graph?.edges ?? []).map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "straight",
      style:
        e.type === "wikilink"
          ? { stroke: "#6366f1", strokeWidth: 2 }
          : { stroke: "#9a99a3", strokeWidth: 1.5, strokeDasharray: "5 5" },
    }));
  }, [graph]);

  const handleNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelectedId((cur) => (cur === node.id ? null : node.id));
  }, []);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  const linked = useMemo(() => {
    if (!graph || !selectedId) return [];
    return graph.edges
      .filter((e) => e.type === "wikilink" && (e.source === selectedId || e.target === selectedId))
      .map((e) => nodeById.get(e.source === selectedId ? e.target : e.source))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));
  }, [graph, selectedId, nodeById]);

  const related = useMemo(() => {
    if (!graph || !selectedId) return [];
    return graph.edges
      .filter((e) => e.type === "semantic" && (e.source === selectedId || e.target === selectedId))
      .map((e) => ({
        note: nodeById.get(e.source === selectedId ? e.target : e.source),
        score: e.score ?? 0,
      }))
      .filter((r): r is { note: NonNullable<typeof r.note>; score: number } => Boolean(r.note))
      .sort((a, b) => b.score - a.score);
  }, [graph, selectedId, nodeById]);

  if (graph === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="h-5 w-5" />
          <span>Mapping your notes…</span>
        </div>
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <Workflow className="h-8 w-8" />
        <p className="text-sm">Write a few notes and they&apos;ll start showing up here, linked.</p>
      </div>
    );
  }

  const clusterCount = new Set(graph.nodes.map((n) => n.cluster).filter((c) => c > 0)).size;
  const orphanCount = graph.nodes.filter((n) => n.orphan).length;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
          <p className="text-xs font-medium text-muted-foreground">
            {graph.nodes.length} notes · {graph.edges.length} connections · {orphanCount} orphans
            {clusterByTopic && clusterCount > 0 ? ` · ${clusterCount} clusters` : ""}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-[200px] items-center gap-2 rounded-full border border-border bg-muted/50 px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => setClusterByTopic((v) => !v)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                clusterByTopic
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground",
              )}
            >
              <Workflow className="h-3.5 w-3.5" />
              Cluster by topic
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <ReactFlowProvider>
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedId(null)}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable className="!border !border-border !bg-card" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      {selected && (
        <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-card p-6">
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: clusterByTopic && selected.cluster > 0
                    ? CLUSTER_COLORS[selected.cluster % CLUSTER_COLORS.length]
                    : CLUSTER_COLORS[0],
                }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Selected note
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-snug">{selected.title}</h2>
          </div>

          {linked.length === 0 && related.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-center">
              <p className="text-xs leading-relaxed text-muted-foreground">
                This note hasn&apos;t been linked to anything else in your second brain yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {linked.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Linked mentions
                  </span>
                  {linked.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                    >
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Linked
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {related.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Related
                  </span>
                  {related.map(({ note, score }) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <span className="truncate text-sm font-medium">{note.title}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto flex gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenNote(selected.id as Id<"notes">)}
            >
              Open note
            </Button>
            <Button
              className="flex-1"
              onClick={() =>
                onDiscussInChat(
                  [selected.id, ...linked.map((n) => n.id), ...related.map((r) => r.note.id)] as Id<"notes">[],
                )
              }
            >
              Discuss in chat
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}
