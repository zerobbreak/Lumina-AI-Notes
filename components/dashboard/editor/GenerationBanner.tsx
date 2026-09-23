"use client";

import { useState } from "react";
import { AlertCircle, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useJobActions } from "@/lib/hooks/jobs/useJobActions";
import type { JobDto, RecordingStage } from "@/types/api/jobs";

const STAGE_LABEL: Record<RecordingStage, string> = {
  transcribe: "Transcribing the recording",
  research: "Reading your sources",
  generate: "Writing your notes",
  validate: "Checking depth and accuracy",
  save: "Adding them to this page",
};

function activeLabel(job: JobDto | undefined) {
  if (!job || job.status === "queued") return "Waiting for a free worker";
  if (job.status === "retrying") return "Hit a snag, trying again shortly";
  return job.stage ? STAGE_LABEL[job.stage] : "Starting";
}

/**
 * Sits above a note whose content a background job is writing. The editor is
 * read-only meanwhile; on failure this offers Retry (resumes where it
 * stopped) or Dismiss (unlocks the note as it is).
 */
export function GenerationBanner({ job, noteId }: { job: JobDto | undefined; noteId: string }) {
  const { retryJob, dismissJob } = useJobActions();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(failure, { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  if (job?.status === "failed") {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <span className="min-w-0 flex-1 text-foreground">
          {job.error ?? "Couldn't generate notes from this recording"}
        </span>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void run(() => retryJob(job.id), "Couldn't retry")}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Retry
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void run(() => dismissJob(job.id, noteId), "Couldn't dismiss")}
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  const progress = job?.progress ?? 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 text-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        <span className="flex-1 text-foreground">
          Generating notes · <span className="text-muted-foreground">{activeLabel(job)}</span>
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-0.5 bg-primary/10">
        <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
