"use client";

import { useEffect, useRef } from "react";

import type { Id } from "@/types/data-model";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";
import { pluralNotes } from "@/lib/studio/sessions";
import { StudioChatRail } from "./StudioChatRail";
import { StudioComposer } from "./StudioComposer";
import { StudioContextRail } from "./StudioContextRail";
import { StudioMessageList } from "./StudioMessageList";
import { StudioModeToggle, type StudioMode } from "./StudioModeToggle";

interface StudioChatDeskProps {
  chat: StudioChat;
  onModeChange: (mode: StudioMode) => void;
  onOpenNote: (noteId: Id<"notes">) => void;
  onOpenInGraph: (noteId: Id<"notes">) => void;
}

/** Chat mode — the "research desk": chats | conversation | context. */
export function StudioChatDesk({ chat, onModeChange, onOpenNote, onOpenInGraph }: StudioChatDeskProps) {
  const { messages, isThinking, mode, activeSession, pinnedIds } = chat;

  // Scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <StudioChatRail chat={chat} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex flex-shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-6 py-3 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">
              {activeSession?.title ?? "Note Studio"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeSession ? `grounded in ${pluralNotes(pinnedIds.length)}` : "Your second brain"}
            </p>
          </div>
          <StudioModeToggle value="chat" onChange={onModeChange} className="shrink-0" />
        </header>

        <StudioMessageList
          ref={scrollRef}
          messages={messages}
          isThinking={isThinking}
          mode={mode}
          onOpenNote={onOpenNote}
        />

        <footer className="flex-shrink-0 p-4 pt-0">
          <StudioComposer chat={chat} className="mx-auto max-w-3xl" />
        </footer>
      </div>

      <StudioContextRail chat={chat} onOpenNote={onOpenNote} onOpenInGraph={onOpenInGraph} />
    </div>
  );
}
