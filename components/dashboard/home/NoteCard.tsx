import { ArrowUpRight, Clock, Pin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type NoteLike = {
  _id: Id<"notes">;
  title: string;
  content?: string;
  createdAt: number;
  isPinned?: boolean;
  courseId?: string;
  moduleId?: string;
  outlineData?: string;
  linkedDocumentIds?: Array<Id<"files">>;
  sourceRecordingId?: Id<"recordings">;
  wordCount?: number;
};

export type NoteLabelLookup = (args: {
  courseId?: string;
  moduleId?: string;
}) => { courseLabel?: string; moduleLabel?: string };

function stripHtmlToText(html: string) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function formatRelativeTime(ts: number) {
  const deltaMs = Date.now() - ts;
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes <= 0) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildStatusChips(note: NoteLike) {
  const chips: Array<{ label: string; tone: "primary" | "muted" }> = [];
  if (note.sourceRecordingId) chips.push({ label: "Lecture", tone: "primary" });
  if (note.outlineData?.trim()) chips.push({ label: "Outline", tone: "muted" });
  if (note.linkedDocumentIds && note.linkedDocumentIds.length > 0)
    chips.push({ label: "Sources", tone: "muted" });
  if ((note.wordCount ?? 0) >= 600) chips.push({ label: "Deep", tone: "muted" });
  return chips.slice(0, 3);
}

export function NoteCard({
  note,
  onOpen,
  lookupLabels,
  className,
}: {
  note: NoteLike;
  onOpen: (id: NoteLike["_id"]) => void;
  lookupLabels?: NoteLabelLookup;
  className?: string;
}) {
  const labels = lookupLabels?.({
    courseId: note.courseId,
    moduleId: note.moduleId,
  });
  const primaryTag = labels?.moduleLabel || labels?.courseLabel;
  const contentText = note.content ? stripHtmlToText(note.content) : "";
  const snippet = contentText ? contentText.slice(0, 120) : "";
  const chips = buildStatusChips(note);

  return (
    <button
      type="button"
      onClick={() => onOpen(note._id)}
      className={cn(
        "group relative w-full text-left rounded-2xl border border-border bg-card text-card-foreground shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-[#121212]/60 dark:shadow-none dark:ring-0",
        "px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:bg-accent/35 dark:hover:bg-white/8",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-cyan-500/8 via-transparent to-indigo-500/8 dark:from-cyan-400/10 dark:to-indigo-400/10" />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground line-clamp-2">
              {note.title || "Untitled"}
            </h3>
            {note.isPinned ? (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                <Pin className="h-3 w-3" aria-hidden />
                Pinned
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {primaryTag ? (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground dark:bg-white/5">
                {primaryTag}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/20 px-2.5 py-1 text-[10px] font-medium text-muted-foreground/80 dark:bg-white/5">
                General
              </span>
            )}

            {chips.map((c) => (
              <span
                key={c.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border",
                  c.tone === "primary"
                    ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                    : "border-border bg-muted/20 text-muted-foreground dark:bg-white/5",
                )}
              >
                {c.tone === "primary" ? (
                  <Sparkles className="h-3 w-3 opacity-80" aria-hidden />
                ) : null}
                {c.label}
              </span>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {snippet || "No preview yet — open to start writing."}
          </p>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            <span>Edited {formatRelativeTime(note.createdAt)}</span>
          </div>
        </div>

        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground/70 opacity-0 -rotate-6 group-hover:opacity-100 group-hover:rotate-0 transition-all duration-300"
          aria-hidden
        />
      </div>
    </button>
  );
}

