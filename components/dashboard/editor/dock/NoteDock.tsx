"use client";

import { AudioLines, Layers, Link2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AIAssistantPanel } from "@/components/dashboard/ai/AIAssistantPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ConnectedCard } from "./ConnectedCard";
import { DockCard } from "./DockCard";
import { SourceCard } from "./SourceCard";
import { StudyCard } from "./StudyCard";
import { useNoteHeadings } from "./useNoteHeadings";
import { useNoteStudy } from "./useNoteStudy";

type Item = "outline" | "study" | "source" | "connected" | "ask";

/** Beyond this many headings the ticks would outgrow the dock. */
const MAX_TICKS = 24;

interface NoteDockProps {
  noteId: string;
  /** Element id of the rendered note, which the outline reads headings from. */
  contentId: string;
  note: {
    title: string;
    content?: string;
    courseId?: string;
    sourceRecordingId?: string;
  };
  courseName?: string;
  subPages: readonly { _id: string; title: string }[];
  canEdit: boolean;
  onInsertToNote?: (content: string) => void;
  onMakeFlashcards: () => void;
  onMakeQuiz: () => void;
  onCreateSubPage: () => void;
}

/**
 * A slim floating dock on the right of a note. The ticks at the top are the
 * note's headings (the current one is longer and in the accent colour); the
 * buttons below open one floating card at a time beside the dock. It never
 * takes a column from the note.
 */
export function NoteDock({
  noteId,
  contentId,
  note,
  courseName,
  subPages,
  canEdit,
  onInsertToNote,
  onMakeFlashcards,
  onMakeQuiz,
  onCreateSubPage,
}: NoteDockProps) {
  // The open card remembers which note it belongs to, so switching notes
  // starts with the dock closed.
  const [open, setOpen] = useState<{ noteId: string; item: Item } | null>(null);
  const active = open?.noteId === noteId ? open.item : null;
  const setActive = useCallback(
    (next: Item | null | ((cur: Item | null) => Item | null)) =>
      setOpen((prev) => {
        const cur = prev?.noteId === noteId ? prev.item : null;
        const value = typeof next === "function" ? next(cur) : next;
        return value ? { noteId, item: value } : null;
      }),
    [noteId],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { headings, activeIndex, scrollTo } = useNoteHeadings(contentId, noteId);
  const study = useNoteStudy(noteId);

  const close = useCallback(() => setActive(null), [setActive]);
  const toggle = (item: Item) => setActive((cur) => (cur === item ? null : item));

  // Close on a click anywhere outside the dock and its cards.
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active, close]);

  // The outline also opens on hover over the ticks, and closes shortly after
  // the pointer leaves the dock, unless a card was opened by clicking.
  const hoverOpenOutline = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive((cur) => cur ?? "outline"), 120);
  };
  const hoverLeave = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive((cur) => (cur === "outline" ? null : cur)), 250);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const ticks = headings.slice(0, MAX_TICKS);
  const cardId = (item: Item) => `note-dock-${item}`;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={rootRef}
        onPointerLeave={hoverLeave}
        onPointerEnter={() => clearTimeout(hoverTimer.current)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && active) {
            e.stopPropagation();
            close();
          }
        }}
        className="absolute right-4 top-20 z-30 hidden lg:block"
      >
        <div className="flex w-11 flex-col items-center gap-1 rounded-2xl border border-border bg-popover/90 py-2.5 shadow-lg backdrop-blur-sm">
          {ticks.length > 0 && (
            <>
              <nav
                aria-label="On this page"
                onPointerEnter={hoverOpenOutline}
                className="flex w-5 flex-col items-end py-1"
              >
                {ticks.map((h, i) => {
                  const isCurrent = i === activeIndex;
                  return (
                    <button
                      key={`${i}-${h.text}`}
                      type="button"
                      onClick={() => scrollTo(i)}
                      onFocus={() => setActive((cur) => cur ?? "outline")}
                      aria-label={h.text}
                      aria-current={isCurrent ? "location" : undefined}
                      className="group/tick flex h-2.5 w-full items-center justify-end focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "h-[2px] rounded-full transition-all group-hover/tick:bg-foreground/70 group-focus-visible/tick:bg-foreground",
                          isCurrent ? "bg-primary" : "bg-muted-foreground/45",
                          isCurrent ? "w-4" : h.level === 1 ? "w-3" : h.level === 2 ? "w-2.5" : "w-1.5",
                        )}
                      />
                    </button>
                  );
                })}
              </nav>
              <div className="my-1 h-px w-5 bg-border" />
            </>
          )}

          <DockButton
            label={study.due > 0 ? `Study this note, ${study.due} due` : "Study this note"}
            isOpen={active === "study"}
            controls={cardId("study")}
            onClick={() => toggle("study")}
            badge={study.due > 0 ? (study.due > 99 ? "99+" : String(study.due)) : undefined}
          >
            <Layers className="h-[15px] w-[15px]" />
          </DockButton>
          {note.sourceRecordingId && (
            <DockButton
              label="From the lecture"
              isOpen={active === "source"}
              controls={cardId("source")}
              onClick={() => toggle("source")}
            >
              <AudioLines className="h-[15px] w-[15px]" />
            </DockButton>
          )}
          <DockButton
            label="Connected"
            isOpen={active === "connected"}
            controls={cardId("connected")}
            onClick={() => toggle("connected")}
          >
            <Link2 className="h-[15px] w-[15px]" />
          </DockButton>
          <DockButton
            label="Ask about this note"
            isOpen={active === "ask"}
            controls={cardId("ask")}
            onClick={() => toggle("ask")}
          >
            <Sparkles className="h-[15px] w-[15px]" />
          </DockButton>
        </div>

        {active === "outline" && ticks.length > 0 && (
          <DockCard id={cardId("outline")} title="On this page" className="max-h-[60vh] overflow-y-auto">
            <ol className="border-l border-border">
              {headings.map((h, i) => (
                <li key={`${i}-${h.text}`}>
                  <button
                    type="button"
                    onClick={() => scrollTo(i)}
                    className={cn(
                      "relative block w-full py-1 pr-1 text-left text-[12.5px] leading-snug transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      h.level === 1 ? "pl-3" : h.level === 2 ? "pl-3" : "pl-6",
                      i === activeIndex ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {i === activeIndex && (
                      <span aria-hidden className="absolute -left-px inset-y-1 w-[2px] rounded-full bg-primary" />
                    )}
                    {h.text}
                  </button>
                </li>
              ))}
            </ol>
          </DockCard>
        )}

        {active === "study" && (
          <DockCard id={cardId("study")} title="Study this note">
            <StudyCard
              study={study}
              onMakeFlashcards={() => {
                close();
                onMakeFlashcards();
              }}
              onMakeQuiz={() => {
                close();
                onMakeQuiz();
              }}
              onNavigate={close}
            />
          </DockCard>
        )}

        {active === "source" && note.sourceRecordingId && (
          <DockCard id={cardId("source")} title="From the lecture">
            <SourceCard recordingId={note.sourceRecordingId} />
          </DockCard>
        )}

        {active === "connected" && (
          <DockCard id={cardId("connected")} title="Connected">
            <ConnectedCard
              noteId={noteId}
              courseId={note.courseId}
              courseName={courseName}
              subPages={subPages}
              canEdit={canEdit}
              onCreateSubPage={() => {
                close();
                onCreateSubPage();
              }}
              onNavigate={close}
            />
          </DockCard>
        )}

        <div id={cardId("ask")}>
          <AIAssistantPanel
            isOpen={active === "ask"}
            onClose={close}
            context={note.content || ""}
            contextType="note"
            contextTitle={note.title}
            onInsertToNote={onInsertToNote}
            className="absolute right-full top-0 mr-2.5 h-[min(600px,calc(100vh-7rem))]"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function DockButton({
  label,
  isOpen,
  controls,
  onClick,
  badge,
  children,
}: {
  label: string;
  isOpen: boolean;
  controls: string;
  onClick: () => void;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-expanded={isOpen}
          aria-controls={controls}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isOpen
              ? "bg-primary text-primary-foreground"
              : "text-foreground/75 hover:bg-accent hover:text-foreground",
          )}
        >
          {children}
          {badge && (
            <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-warning px-0.5 text-[9px] font-bold tabular-nums text-background">
              {badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      {!isOpen && <TooltipContent side="left">{label}</TooltipContent>}
    </Tooltip>
  );
}
