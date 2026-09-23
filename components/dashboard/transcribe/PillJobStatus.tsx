"use client";

import { AlertCircle, Check, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobDto } from "@/types/api/jobs";
import { JOB_STEPS, jobStepIndex, phaseLabel, type JobPhase } from "./pillPhases";

const ACTIVE: readonly JobPhase[] = ["queued", "transcribing", "researching", "writing", "checking", "saving"];

export const isActiveJobPhase = (phase: string): phase is JobPhase =>
  (ACTIVE as readonly string[]).includes(phase);

/**
 * The pill's face while a recording job runs: what it's doing now, and one
 * dot per pipeline step (done, current, still to come).
 */
export function PillJobStatus({ job, phase }: { job: JobDto; phase: JobPhase }) {
  const current = jobStepIndex(job);
  const Icon =
    phase === "failed" ? AlertCircle : phase === "ready" ? Check : phase === "retrying" ? RotateCw : Loader2;

  return (
    <span className="flex min-w-0 items-center gap-2 text-xs" title={phase === "failed" ? job.error ?? undefined : undefined}>
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", isActiveJobPhase(phase) && "animate-spin")}
        aria-hidden
      />
      <span className="truncate whitespace-nowrap font-medium">{phaseLabel(phase)}</span>
      {phase !== "ready" && phase !== "failed" && (
        <span className="hidden items-center gap-1 sm:flex" aria-hidden>
          {JOB_STEPS.map((step, i) => (
            <span
              key={step}
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-current transition-opacity",
                i < current ? "opacity-100" : i === current ? "animate-pulse opacity-100" : "opacity-25",
              )}
            />
          ))}
        </span>
      )}
    </span>
  );
}

/** Thin bar along the pill's bottom edge, filled to the job's progress. */
export function PillJobProgressBar({ progress }: { progress: number }) {
  return (
    <span className="pointer-events-none absolute inset-x-5 bottom-0 h-[2px] overflow-hidden rounded-full bg-primary/10" aria-hidden>
      <span
        className="block h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(4, progress)}%` }}
      />
    </span>
  );
}
