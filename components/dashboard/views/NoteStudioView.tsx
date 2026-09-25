"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Id } from "@/types/data-model";
import { useStudioChat } from "@/lib/hooks/chats/useStudioChat";
import { KnowledgeGraph } from "@/components/dashboard/studio/KnowledgeGraph";
import { StudioChatDesk } from "@/components/dashboard/studio/StudioChatDesk";
import { StudioModeToggle, type StudioMode } from "@/components/dashboard/studio/StudioModeToggle";

export default function NoteStudioView() {
  const router = useRouter();
  const chat = useStudioChat();
  const [studioMode, setStudioMode] = useState<StudioMode>("chat");

  const openNote = (noteId: Id<"notes">) => router.push(`/dashboard?noteId=${noteId}`);

  if (studioMode === "chat") {
    return (
      <StudioChatDesk
        chat={chat}
        onModeChange={setStudioMode}
        onOpenNote={openNote}
        onOpenInGraph={() => setStudioMode("graph")}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex flex-shrink-0 items-center justify-between border-b px-6 py-3">
        <h1 className="text-base font-semibold tracking-tight">Note Studio</h1>
        <StudioModeToggle value="graph" onChange={setStudioMode} />
      </header>
      <KnowledgeGraph
        onOpenNote={openNote}
        onDiscussInChat={(noteIds) => {
          // Graph → Chat handoff: the neighbourhood is pinned so the chat
          // starts grounded, then we switch over.
          void chat.pinNotes(noteIds).then(() => setStudioMode("chat"));
        }}
      />
    </div>
  );
}
