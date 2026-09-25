"use client";

import { useMemo } from "react";

import type { Id } from "@/types/data-model";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";
import { useKnowledgeGraphData } from "@/lib/hooks/knowledgeGraph/useKnowledgeGraphData";
import { nodeNeighbours } from "@/lib/studio/neighbourhood";
import { GraphChatDock } from "./GraphChatDock";
import { KnowledgeGraph } from "./KnowledgeGraph";
import { StudioModeToggle, type StudioMode } from "./StudioModeToggle";

interface StudioGraphModeProps {
  chat: StudioChat;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  focus: { id: string; nonce: number } | null;
  onModeChange: (mode: StudioMode) => void;
  onOpenNote: (noteId: Id<"notes">) => void;
}

/** Graph mode — the graph fills the Studio, with the chat docked on the right. */
export function StudioGraphMode({
  chat,
  selectedId,
  onSelectedIdChange,
  focus,
  onModeChange,
  onOpenNote,
}: StudioGraphModeProps) {
  const graph = useKnowledgeGraphData();

  const selected = useMemo(
    () => (selectedId ? graph?.nodes.find((n) => n.id === selectedId) ?? null : null),
    [graph, selectedId],
  );
  const neighbours = useMemo(
    () => (graph && selected ? nodeNeighbours(graph, selected.id) : []),
    [graph, selected],
  );
  const hoodIds = useMemo(
    () => (selected ? [selected.id, ...neighbours.map((n) => n.node.id)] : []),
    [selected, neighbours],
  );
  const highlightIds = useMemo(() => new Set(hoodIds), [hoodIds]);
  const grounded = hoodIds.length > 0 && hoodIds.every((id) => chat.pinnedIds.includes(id as Id<"notes">));

  const pinHood = (id: string) => {
    if (!graph) return;
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return;
    const ids = [node.id, ...nodeNeighbours(graph, node.id).map((n) => n.node.id)] as Id<"notes">[];
    void chat.pinNotes(ids, `Graph: ${node.title}`.slice(0, 80));
  };

  // Picking a node grounds the active chat in its neighbourhood (the old
  // "Discuss in chat"), without leaving the graph.
  const selectAndPin = (id: string | null) => {
    onSelectedIdChange(id);
    if (id) pinHood(id);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-background text-foreground">
      <KnowledgeGraph
        graph={graph}
        selectedId={selectedId}
        onSelect={selectAndPin}
        highlightIds={highlightIds}
        focus={focus}
        toolbarStart={
          <>
            <span className="pl-2 pr-1 text-sm font-semibold tracking-tight">Studio</span>
            <StudioModeToggle value="graph" onChange={onModeChange} />
          </>
        }
      />
      <GraphChatDock
        chat={chat}
        selected={selected}
        neighbours={neighbours}
        grounded={grounded}
        onPinNeighbourhood={() => selected && pinHood(selected.id)}
        onSelectNode={selectAndPin}
        onOpenNote={onOpenNote}
        onOpenFullChat={() => onModeChange("chat")}
      />
    </div>
  );
}
