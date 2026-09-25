"use client";

import { AtSign, Send, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHAT_MODES, MODE_LABELS, type ChatMode } from "@/lib/studio/sessions";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";

interface StudioComposerProps {
  chat: StudioChat;
  compact?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Textarea on top; mode dropdown, "@ Add note" and send underneath. Picked
 * (not yet sent) notes sit above the textarea as pills.
 */
export function StudioComposer({ chat, compact, placeholder, className }: StudioComposerProps) {
  const {
    input,
    textareaRef,
    handleInputChange,
    handleKeyDown,
    send,
    selectedNotes,
    removeSelectedNote,
    showMentions,
    filteredNotes,
    mentionActiveIndex,
    setMentionActiveIndex,
    selectMentionNote,
    openMentionPicker,
    mode,
    setMode,
    activeSessionId,
  } = chat;

  const canSend = input.trim().length > 0 || selectedNotes.length > 0;
  const onSend = () => void send();

  return (
    <div className={cn("relative", className)}>
      {/* Mentions dropdown */}
      {showMentions && (
        <div className="absolute bottom-full left-0 z-50 mb-2 max-h-60 w-64 overflow-y-auto rounded-lg border bg-background p-1 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select Note
          </div>
          {filteredNotes.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No notes found.</div>
          ) : (
            filteredNotes.map((note, idx) => (
              <button
                key={note._id}
                type="button"
                onClick={() => selectMentionNote(note)}
                onMouseEnter={() => setMentionActiveIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-2 truncate rounded-md px-3 py-2 text-left text-sm outline-none transition-colors",
                  idx === mentionActiveIndex ? "bg-muted" : "hover:bg-muted",
                )}
              >
                <AtSign className="h-3 w-3 shrink-0 text-primary" />
                {note.title}
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex flex-col overflow-hidden rounded-2xl border bg-muted/50 shadow-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-ring">
        {selectedNotes.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {selectedNotes.map((n) => (
              <div
                key={n._id}
                className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
              >
                <span>@{n.title}</span>
                <button
                  type="button"
                  onClick={() => removeSelectedNote(n._id)}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label={`Remove ${n.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, onSend)}
          placeholder={placeholder ?? "Ask your second brain... (Type @ to mention notes)"}
          className={cn(
            "max-h-32 w-full resize-none border-none bg-transparent px-4 focus:outline-none",
            compact ? "min-h-[40px] py-2.5 text-[13px]" : "min-h-[52px] py-3 text-sm",
          )}
          rows={compact ? 1 : 2}
        />

        <div className="flex items-center gap-1.5 px-2 pb-2">
          <Select
            value={mode}
            onValueChange={(v) => void setMode(v as ChatMode)}
            disabled={!activeSessionId}
          >
            <SelectTrigger
              size="sm"
              className="h-8 rounded-full border-border/60 bg-background/60 px-3 text-xs font-semibold"
              aria-label="Chat mode"
            >
              <SelectValue>{MODE_LABELS[mode]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CHAT_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openMentionPicker}
            className="h-8 gap-1 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <AtSign className="h-3.5 w-3.5" />
            Add note
          </Button>

          <Button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            size="icon"
            className="ml-auto h-8 w-8 shrink-0 rounded-xl shadow-sm"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
