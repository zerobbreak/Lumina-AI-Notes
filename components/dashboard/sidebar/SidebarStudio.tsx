"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  FileAudio,
  Link2,
  Pin,
  Sparkles,
  Trash2,
  Waves,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeTranscriptForPrompt } from "@/convex/shared/transcript";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/hooks/useDashboard";
import { MAX_REFERENCE_URLS } from "@/components/dashboard/DashboardContext";

/**
 * Capture support that outgrew the transcription pill.
 *
 * The pill owns the live loop (record → generate → insert); everything that
 * needs a list or a form — saved sessions, a pinned source document, reference
 * links — lives here in the left rail and feeds the pill through dashboard
 * context.
 */
export function SidebarStudio({ isCompact }: { isCompact: boolean }) {
  const {
    activeContext,
    setActiveContext,
    referenceUrls,
    addReferenceUrls,
    removeReferenceUrl,
    loadSession,
  } = useDashboard();

  const recordings = useQuery(api.recordings.getRecordings);
  const deleteRecording = useMutation(api.recordings.deleteRecording);
  const cleanupOrphaned = useMutation(
    api.recordings.cleanupOrphanedRecordings,
  );

  const [urlDraft, setUrlDraft] = useState("");
  const [showLinks, setShowLinks] = useState(false);

  const sessions = (recordings ?? []).filter(
    (r) => r.transcript && r.transcript.trim().length > 0,
  );
  const failedCount = (recordings ?? []).length - sessions.length;

  if (isCompact) {
    return (
      <div className="flex w-full flex-col items-center">
        <Waves
          className="h-4 w-4 text-muted-foreground/60 dark:text-muted-foreground/25"
          aria-label="Studio"
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-0.5 flex items-center justify-between px-2">
        <h3 className="select-none text-[11px] font-medium text-muted-foreground dark:text-muted-foreground/55">
          Studio
        </h3>
        {failedCount > 0 && (
          <button
            type="button"
            className="text-[10px] text-amber-600 hover:underline dark:text-amber-500"
            onClick={async () => {
              try {
                const r = await cleanupOrphaned();
                toast.success(`Removed ${r.deletedCount} failed recording(s)`);
              } catch {
                toast.error("Cleanup failed");
              }
            }}
          >
            Clean up {failedCount}
          </button>
        )}
      </div>

      {/* Pinned source document — generation runs against this when set. */}
      {activeContext ? (
        <div className="mx-1 mb-1.5 flex items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5">
          <Pin className="h-3 w-3 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-sidebar-foreground">
              {activeContext.name}
            </p>
            <p className="text-[10px] text-muted-foreground">Pinned context</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveContext(null)}
            aria-label="Unpin context"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {/* Saved sessions — clicking one hands its transcript to the pill. */}
      <div className="w-full space-y-px">
        {sessions.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground/85 dark:text-muted-foreground/45">
            No sessions yet
          </p>
        ) : (
          sessions.slice(0, 6).map((r) => (
            <div key={r._id} className="group/session relative flex items-center">
              <button
                type="button"
                onClick={() => {
                  // Canonical flattening: handles both the chunk-array and
                  // legacy plain-text shapes, and prefers each chunk's
                  // AI-enhanced text over the raw dictation.
                  const transcript = normalizeTranscriptForPrompt(r.transcript);
                  if (!transcript) {
                    toast.error("That session has no transcript");
                    return;
                  }
                  loadSession({
                    recordingId: r._id,
                    title: r.title,
                    transcript,
                  });
                  toast.success("Session loaded into the capture pill");
                }}
                className={cn(
                  "flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/92 transition-colors",
                  "hover:bg-sidebar-accent/40 hover:text-sidebar-foreground dark:text-muted-foreground/72",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                )}
                title={r.title}
              >
                <FileAudio className="h-[14px] w-[14px] shrink-0 opacity-75" />
                <span className="flex-1 truncate text-left">{r.title}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteRecording({ recordingId: r._id as Id<"recordings"> })}
                aria-label={`Delete ${r.title}`}
                className="absolute right-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/session:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Reference links — public pages merged into the generation prompt. */}
      <button
        type="button"
        onClick={() => setShowLinks((s) => !s)}
        className="mt-1 flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/92 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground dark:text-muted-foreground/72"
      >
        <Link2 className="h-[14px] w-[14px] shrink-0 opacity-75" />
        <span className="flex-1 text-left">Reference links</span>
        {referenceUrls.length > 0 && (
          <span className="rounded bg-sidebar-accent px-1.5 text-[10px] text-muted-foreground">
            {referenceUrls.length}
          </span>
        )}
      </button>

      {showLinks && (
        <div className="mx-1 mt-1 space-y-2 rounded-md border border-sidebar-border bg-background/60 p-2">
          <p className="text-[10px] leading-snug text-muted-foreground">
            Add public pages (syllabus, docs). Their text is fetched and used
            alongside your transcript. Up to {MAX_REFERENCE_URLS}.
          </p>
          <div className="flex gap-1.5">
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const { added, rejected } = addReferenceUrls(urlDraft);
                if (rejected.length) {
                  toast.error(`Not a valid URL: ${rejected[0]}`);
                }
                if (added > 0) setUrlDraft("");
              }}
              placeholder="https://…"
              aria-label="Reference link URL"
              className="h-7 text-xs"
            />
          </div>
          {referenceUrls.map((u) => (
            <div
              key={u}
              className="flex items-start gap-1.5 rounded border border-border/50 bg-muted/20 px-1.5 py-1"
            >
              <span
                className="min-w-0 flex-1 break-all text-[10px] text-muted-foreground"
                title={u}
              >
                {u}
              </span>
              <button
                type="button"
                onClick={() => removeReferenceUrl(u)}
                aria-label="Remove link"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pin/unpin control shown on each file row in the Resources list. */
export function PinContextButton({
  fileId,
  fileName,
}: {
  fileId: string;
  fileName: string;
}) {
  const { activeContext, setActiveContext } = useDashboard();
  const isPinned = activeContext?.type === "file" && activeContext.id === fileId;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-5 w-5 rounded-sm",
        isPinned
          ? "text-primary"
          : "text-muted-foreground/60 hover:text-sidebar-foreground",
      )}
      aria-label={isPinned ? `Unpin ${fileName}` : `Pin ${fileName} as context`}
      title={isPinned ? "Unpin as context" : "Pin as generation context"}
      onClick={(e) => {
        e.stopPropagation();
        setActiveContext(
          isPinned ? null : { id: fileId, name: fileName, type: "file" },
        );
      }}
    >
      <Sparkles className="h-3 w-3" />
    </Button>
  );
}
