"use client";

import { useEffect, useRef } from "react";

import type { Id } from "@/types/data-model";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";
import { StudioChatRail } from "./StudioChatRail";
import { StudioComposer } from "./StudioComposer";
import { StudioContextRail } from "./StudioContextRail";
import { StudioMessageList } from "./StudioMessageList";

interface StudioChatDeskProps {
  chat: StudioChat;
  onOpenNote: (noteId: Id<"notes">) => void;
  onOpenInGraph: (noteId: Id<"notes">) => void;
}

/** Chat mode — the "research desk": chats | conversation | context. */
export function StudioChatDesk({ chat, onOpenNote, onOpenInGraph }: StudioChatDeskProps) {
  const { messages, isThinking, mode } = chat;

  // Scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <StudioChatRail chat={chat} />

      <div className="flex min-w-0 flex-1 flex-col">
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
