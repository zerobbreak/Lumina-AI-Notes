"use client";

import { useEffect, useRef } from "react";
import { Maximize2, MessageSquare, PanelRightClose, Plus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Id } from "@/types/data-model";
import type { KnowledgeGraphNodeDto } from "@/types/api/knowledgeGraph";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";
import { sessionSubline } from "@/lib/studio/sessions";
import { suggestedPrompts, type GraphNeighbour } from "@/lib/studio/neighbourhood";
import { StudioComposer } from "./StudioComposer";
import { StudioMessageList } from "./StudioMessageList";

interface GraphChatDockProps {
  chat: StudioChat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: KnowledgeGraphNodeDto | null;
  neighbours: GraphNeighbour[];
  /** True once the selected note and its neighbours are all pinned. */
  grounded: boolean;
  onPinNeighbourhood: () => void;
  onSelectNode: (id: string) => void;
  onOpenNote: (noteId: Id<"notes">) => void;
  onOpenFullChat: () => void;
}

const RECENT_CHATS = 5;

/** Width of the open dock plus its margin, which the graph keeps clear. */
export const GRAPH_DOCK_WIDTH = 412;

/** Floating chat on the graph: the same active session as Chat mode. */
export function GraphChatDock({
  chat,
  open,
  onOpenChange,
  selected,
  neighbours,
  grounded,
  onPinNeighbourhood,
  onSelectNode,
  onOpenNote,
  onOpenFullChat,
}: GraphChatDockProps) {
  const { messages, isThinking, mode, activeSession, activeSessionId, sessions, selectSession, send } = chat;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking, open]);

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => onOpenChange(true)}
        className="absolute right-3 top-3 z-20 gap-2 rounded-full shadow-md"
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </Button>
    );
  }

  const prompts = selected ? suggestedPrompts(selected.title, neighbours.map((n) => n.node.title)) : [];

  return (
    <aside
      aria-label="Graph chat"
      className="absolute bottom-3 right-3 top-3 z-20 flex w-[400px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-xl backdrop-blur"
    >
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{activeSession?.title ?? "No chat yet"}</p>
          {activeSession && <p className="truncate text-[11px] text-muted-foreground">{sessionSubline(activeSession)}</p>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenFullChat}
          className="h-7 gap-1 px-2 text-xs"
          title="Open full chat"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Open full chat
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="h-7 w-7 text-muted-foreground"
          aria-label="Collapse chat"
          title="Collapse chat"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </header>

      <div className="max-h-[45%] shrink-0 overflow-y-auto border-b px-4 py-3">
        {selected ? (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected</p>
              <button
                type="button"
                onClick={() => onOpenNote(selected.id as Id<"notes">)}
                className="text-left font-reading text-xl font-medium leading-snug hover:underline underline-offset-4"
                title="Open note"
              >
                {selected.title}
              </button>
            </div>
            {neighbours.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {neighbours.map((n) => (
                  <button
                    key={n.node.id}
                    type="button"
                    onClick={() => onSelectNode(n.node.id)}
                    className={cn(
                      "max-w-[16ch] truncate rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      n.kind === "wikilink"
                        ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                        : "border-dashed border-border text-muted-foreground hover:bg-muted",
                    )}
                    title={n.node.title}
                  >
                    {n.node.title}
                  </button>
                ))}
              </div>
            )}
            {grounded ? (
              <p className="text-xs text-muted-foreground">Chat is grounded in the highlighted neighbourhood.</p>
            ) : (
              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onPinNeighbourhood}>
                <Plus className="h-3.5 w-3.5" />
                Ground chat in this neighbourhood
              </Button>
            )}
            <div className="flex flex-col gap-1.5">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={isThinking}
                  onClick={() => void send(p)}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-left text-xs transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{p}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pick a note to start a grounded chat.</p>
            {sessions.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent chats
                </p>
                {sessions.slice(0, RECENT_CHATS).map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => selectSession(s._id)}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-2 py-1.5 text-left transition-colors",
                      s._id === activeSessionId ? "bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    <span className="truncate text-[13px] font-medium">{s.title}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{sessionSubline(s)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <StudioMessageList
        ref={scrollRef}
        messages={messages}
        isThinking={isThinking}
        mode={mode}
        onOpenNote={onOpenNote}
        compact
        empty={<p className="py-6 text-center text-xs text-muted-foreground">No messages in this chat yet.</p>}
      />

      <div className="shrink-0 p-3 pt-0">
        <StudioComposer chat={chat} compact placeholder="Ask about this neighbourhood…" />
      </div>
    </aside>
  );
}
