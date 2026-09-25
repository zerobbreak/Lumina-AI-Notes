"use client";

import { forwardRef } from "react";
import { AtSign, Brain } from "lucide-react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { cn } from "@/lib/utils";
import type { Id } from "@/types/data-model";
import type { ChatMessageModel } from "@/lib/api/adapters/chat";
import { modeLabel } from "@/lib/studio/sessions";

type MessageNote = { id: Id<"notes">; title: string };

/** Keeps our `note-cite:` links, which react-markdown would otherwise blank as unsafe. */
const keepCitations = (url: string) => (url.startsWith("note-cite:") ? url : defaultUrlTransform(url));

function AssistantMarkdown({
  content,
  notes,
  onOpenNote,
  compact,
}: {
  content: string;
  /** The notes cited as [#1], [#2]…, by position; a gap means the note is gone. */
  notes: (MessageNote | undefined)[];
  onOpenNote: (noteId: Id<"notes">) => void;
  compact?: boolean;
}) {
  // Convert [#1] citations into special links we can render as chips.
  const withCitations = content.replace(/\[#(\d+)\]/g, (_m, nStr) => {
    const n = Number(nStr);
    if (!Number.isFinite(n) || n < 1) return `[#${nStr}]`;
    return `[[#${n}]](note-cite:${n})`;
  });

  return (
    <div className={cn("chat-md", compact ? "reading-surface-compact" : "reading-surface")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={keepCitations}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("note-cite:")) {
              const idx = Number(href.slice("note-cite:".length));
              const note = notes[idx - 1];
              if (!note) {
                return (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 font-sans text-[11px] text-muted-foreground">
                    {children}
                  </span>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => onOpenNote(note.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 align-baseline font-sans text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                  title={note.title}
                >
                  {children}
                  <span className="max-w-[18ch] truncate">· {note.title}</span>
                </button>
              );
            }
            return (
              <a
                href={href}
                className="text-primary underline underline-offset-4 hover:opacity-90"
                target="_blank"
                rel="noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {withCitations}
      </ReactMarkdown>
    </div>
  );
}

/**
 * A reply's notes in [#N] order. Looked up by id, since the server leaves
 * deleted notes out of `notes`, which would shift every later citation.
 */
function citedNotes(msg: ChatMessageModel): (MessageNote | undefined)[] {
  return (msg.contextNoteIds ?? []).map((id) => msg.notes?.find((n) => n.id === id));
}

interface StudioMessageListProps {
  messages: ChatMessageModel[] | undefined;
  isThinking: boolean;
  mode: string;
  onOpenNote: (noteId: Id<"notes">) => void;
  /** Tighter spacing and smaller type, for the graph dock. */
  compact?: boolean;
  /** Replaces the default empty state. */
  empty?: React.ReactNode;
  className?: string;
}

/** Chat transcript: user bubbles on the right, assistant replies as reading text. */
export const StudioMessageList = forwardRef<HTMLDivElement, StudioMessageListProps>(
  function StudioMessageList(
    { messages, isThinking, mode, onOpenNote, compact, empty, className },
    ref,
  ) {
    const label = `${modeLabel(mode)} mode`;
    const isEmpty = !messages || messages.length === 0;

    return (
      <div ref={ref} className={cn("flex-1 overflow-y-auto scroll-smooth", className)}>
        <div className={cn("mx-auto", compact ? "space-y-4 px-4 py-3" : "max-w-3xl space-y-8 p-4 pb-20 md:p-8")}>
          {isEmpty &&
            !isThinking &&
            (empty ?? (
              <div className="mt-20 flex h-full flex-col items-center justify-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-reading text-xl font-medium">How can I help you synthesize?</h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Type <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">@</kbd> to
                    reference specific notes in your conversation.
                  </p>
                </div>
              </div>
            ))}

          {messages?.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg._id}
                className="flex w-full flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-primary text-primary-foreground shadow-sm",
                    compact ? "px-3 py-2 text-[13px] leading-relaxed" : "px-4 py-3 text-sm leading-relaxed",
                  )}
                >
                  {msg.content}
                </div>
                {msg.contextNoteIds && msg.contextNoteIds.length > 0 && (
                  <div className="flex max-w-[85%] flex-wrap justify-end gap-1">
                    {msg.notes?.map((note, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onOpenNote(note.id)}
                        className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <AtSign className="h-3 w-3" /> {note.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div key={msg._id} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <AssistantMarkdown
                  content={msg.content}
                  notes={citedNotes(msg)}
                  onOpenNote={onOpenNote}
                  compact={compact}
                />
              </div>
            ),
          )}

          {isThinking && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
                <span className="ml-2 animate-pulse text-[11px] font-medium italic text-muted-foreground">
                  Synthesizing your second brain...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);
