"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Id } from "@/types/data-model";
import { useStudioChat } from "@/lib/hooks/chats/useStudioChat";
import { StudioChatDesk } from "@/components/dashboard/studio/StudioChatDesk";
import { StudioGraphMode } from "@/components/dashboard/studio/StudioGraphMode";
import type { StudioMode } from "@/components/dashboard/studio/StudioModeToggle";

/**
 * Note Studio shell. Both views share one chat (useStudioChat), so switching
 * between Graph and Chat keeps the active session and draft.
 */
export default function NoteStudioView() {
  const router = useRouter();
  const chat = useStudioChat();
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

  if (studioMode === "graph") {
    return (
      <StudioGraphMode
        chat={chat}
        selectedId={graphSelectedId}
        onSelectedIdChange={setGraphSelectedId}
        focus={graphFocus}
        onModeChange={setStudioMode}
        onOpenNote={openNote}
      />
    );
  }

  return (
    <StudioChatDesk
      chat={chat}
      onModeChange={setStudioMode}
      onOpenNote={openNote}
      onOpenInGraph={openInGraph}
    />
  );
}
