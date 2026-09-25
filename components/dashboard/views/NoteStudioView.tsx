"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Id } from "@/types/data-model";
import { useStudioChat } from "@/lib/hooks/chats/useStudioChat";
import { useKnowledgeGraphData } from "@/lib/hooks/knowledgeGraph/useKnowledgeGraphData";
import { pluralNotes } from "@/lib/studio/sessions";
import { StudioChatDesk } from "@/components/dashboard/studio/StudioChatDesk";
import { StudioGraphMode } from "@/components/dashboard/studio/StudioGraphMode";
import { StudioHeader } from "@/components/dashboard/studio/StudioHeader";
import type { StudioMode } from "@/components/dashboard/studio/StudioModeToggle";

/**
 * Note Studio shell. Both views share one chat (useStudioChat) and one header,
 * so switching between Graph and Chat keeps the active session, the draft and
 * the page frame.
 */
export default function NoteStudioView() {
  const router = useRouter();
  const chat = useStudioChat();
  // Loaded here, not only in Graph mode, so switching to the graph is instant.
  const graph = useKnowledgeGraphData();
  const [studioMode, setStudioMode] = useState<StudioMode>("chat");
  const [graphSelectedId, setGraphSelectedId] = useState<string | null>(null);
  const [graphFocus, setGraphFocus] = useState<{ id: string; nonce: number } | null>(null);

  const openNote = (noteId: Id<"notes">) => router.push(`/dashboard?noteId=${noteId}`);

  // Context rail mini-map → graph, centred on the chat's first pinned note.
  const openInGraph = (noteId: Id<"notes">) => {
    setGraphSelectedId(noteId);
    setGraphFocus((prev) => ({ id: noteId, nonce: (prev?.nonce ?? 0) + 1 }));
    setStudioMode("graph");
  };

  const header =
    studioMode === "graph"
      ? {
          title: "Knowledge graph",
          subtitle: graph ? `${pluralNotes(graph.nodes.length)} · ${graph.edges.length} links` : "",
        }
      : {
          title: chat.activeSession?.title ?? "New conversation",
          subtitle: chat.activeSession ? `grounded in ${pluralNotes(chat.pinnedIds.length)}` : "Your second brain",
        };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <StudioHeader mode={studioMode} onModeChange={setStudioMode} {...header} />
      <div className="min-h-0 flex-1">
        {studioMode === "graph" ? (
          <StudioGraphMode
            chat={chat}
            graph={graph}
            selectedId={graphSelectedId}
            onSelectedIdChange={setGraphSelectedId}
            focus={graphFocus}
            onModeChange={setStudioMode}
            onOpenNote={openNote}
          />
        ) : (
          <StudioChatDesk chat={chat} onOpenNote={openNote} onOpenInGraph={openInGraph} />
        )}
      </div>
    </div>
  );
}
