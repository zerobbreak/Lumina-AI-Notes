"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertTriangle, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileWithStatus = {
  processingStatus?: string;
  lastAccessedAt?: number;
  createdAt: number;
};

function pickRelevantFile<T extends FileWithStatus>(files: T[] | undefined): T | undefined {
  if (!files) return undefined;
  const active = files.find(
    (f) => f.processingStatus === "processing" || f.processingStatus === "pending",
  );
  if (active) return active;

  const errored = files.find((f) => f.processingStatus === "error");
  if (errored) return errored;

  // A "done" file the user hasn't opened yet (never touched since upload).
  const unseenDone = files.find(
    (f) =>
      f.processingStatus === "done" &&
      (!f.lastAccessedAt || f.lastAccessedAt === f.createdAt),
  );
  return unseenDone;
}

/**
 * Surfaces the most relevant upload's processing state on the dashboard
 * home — previously this was invisible outside a transient bottom-right
 * toast that disappears once processing finishes.
 */
export function UploadStatusCard({ className }: { className?: string }) {
  const files = useQuery(api.files.getFiles);
  const retryProcessing = useMutation(api.files.retryProcessing);
  const touchFile = useMutation(api.files.touchFile);

  const file = useMemo(() => pickRelevantFile(files), [files]);

  if (!file) return null;

  const status = file.processingStatus;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0",
        className,
      )}
    >
      {(status === "pending" || status === "processing") && (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/20 dark:bg-white/5">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              Processing “{file.name}”
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status === "pending"
                ? file.queuePosition
                  ? `Queued — position ${file.queuePosition}`
                  : "Queued for processing"
                : `Extracting notes${file.progressPercent ? ` — ${file.progressPercent}%` : "…"}`}
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted/30 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${Math.max(8, file.progressPercent ?? 8)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              Couldn’t process “{file.name}”
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {file.errorMessage || "Something went wrong while extracting this file."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 px-2.5 text-xs"
              onClick={() => retryProcessing({ fileId: file._id })}
            >
              <RotateCcw className="w-3 h-3 mr-1.5" aria-hidden />
              Retry
            </Button>
          </div>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              “{file.name}” is ready
            </p>
            {file.summary && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {file.summary}
              </p>
            )}
            {file.keyTopics && file.keyTopics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {file.keyTopics.slice(0, 4).map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300"
                  >
                    <Sparkles className="w-2.5 h-2.5" aria-hidden />
                    {topic}
                  </span>
                ))}
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
              onClick={() => touchFile({ fileId: file._id })}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
