"use client";

import { useMemo, useState } from "react";
import { AtSign, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Id } from "@/types/data-model";
import { useKnowledgeGraphData } from "@/lib/hooks/knowledgeGraph/useKnowledgeGraphData";
import { computeNeighbourhood } from "@/lib/studio/neighbourhood";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";
import { MINI_MAP_HEIGHT, MINI_MAP_WIDTH, NeighbourhoodMiniMap } from "./NeighbourhoodMiniMap";

interface StudioContextRailProps {
  chat: StudioChat;
  onOpenNote: (noteId: Id<"notes">) => void;
  /** Switch to Graph mode focused on this note. */
  onOpenInGraph: (noteId: Id<"notes">) => void;
}

/** Right rail in Chat mode: what the chat is grounded in, and what's nearby. */
export function StudioContextRail({ chat, onOpenNote, onOpenInGraph }: StudioContextRailProps) {
  const { pinnedNotes, pinnedIds, unpin, pinNotes } = chat;
  // Same query the graph uses; React Query shares the cached result.
  const graph = useKnowledgeGraphData();
  const [pinning, setPinning] = useState(false);

  const hood = useMemo(
    () => computeNeighbourhood(graph, pinnedIds, { width: MINI_MAP_WIDTH, height: MINI_MAP_HEIGHT }),
    [graph, pinnedIds],
  );

  const pinRelated = async () => {
    setPinning(true);
    try {
      await pinNotes(hood.related.map((n) => n.id as Id<"notes">));
    } finally {
      setPinning(false);
    }
  };

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l bg-muted/10 p-5 lg:flex">
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Context</h2>
        {pinnedNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
            Nothing pinned yet. Type{" "}
            <kbd className="inline-flex items-center rounded bg-muted px-1 font-mono">
              <AtSign className="h-3 w-3" />
            </kbd>{" "}
            in the composer, or pick notes in the graph, to ground this chat.
          </div>
        ) : (
          <ol className="space-y-1">
            {pinnedNotes.map((n, i) => (
              <li
                key={n.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenNote(n.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm hover:underline underline-offset-2"
                  title="Open note"
                >
                  {n.title}
                </button>
                <button
                  type="button"
                  onClick={() => void unpin(n.id)}
                  className="shrink-0 rounded-full p-0.5 text-muted-foreground opacity-60 hover:bg-muted-foreground/10 hover:text-foreground group-hover:opacity-100"
                  aria-label={`Unpin ${n.title}`}
                  title="Unpin note"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pinnedIds.length > 0 && hood.nodes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Neighbourhood
          </h2>
          <NeighbourhoodMiniMap hood={hood} onClick={() => onOpenInGraph(pinnedIds[0])} />
          {hood.related.length > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {hood.related.length === 1
                  ? "1 related note isn't in context yet"
                  : `${hood.related.length} related notes aren't in context yet`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                disabled={pinning}
                onClick={() => void pinRelated()}
              >
                <Plus className="h-3.5 w-3.5" />
                Pin
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Every neighbour is already in context.</p>
          )}
        </section>
      )}
    </aside>
  );
}
