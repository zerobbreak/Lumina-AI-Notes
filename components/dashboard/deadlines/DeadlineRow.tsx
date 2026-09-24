"use client";

import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";
import { useSetDeadlineCompleted } from "@/lib/mutations/deadlines/useSetDeadlineCompleted";
import { cn } from "@/lib/utils";

export type DeadlineKind = "assignment" | "exam" | "event" | "task";

function kindToTone(kind: DeadlineKind) {
  if (kind === "exam" || kind === "assignment") return "red";
  if (kind === "event") return "amber";
  return "slate";
}

function pillClasses(tone: ReturnType<typeof kindToTone>) {
  if (tone === "red")
    return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
  if (tone === "amber")
    return "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20";
  return "bg-muted/30 text-muted-foreground border-border dark:bg-foreground/5";
}

function kindLabel(kind: DeadlineKind) {
  if (kind === "assignment") return "ASSIGNMENT";
  if (kind === "exam") return "EXAM";
  if (kind === "event") return "EVENT";
  return "TASK";
}

/**
 * One deadline: tick box, title, when it's due, where it came from, and its
 * kind. Ticking marks it done; unticking a finished one reopens it.
 */
export function DeadlineRow({
  deadline,
  when,
  overdue = false,
  detail,
}: {
  deadline: DeadlineModel;
  when: string;
  overdue?: boolean;
  /** Extra context after the time, e.g. the course. */
  detail?: string | null;
}) {
  const setCompleted = useSetDeadlineCompleted();
  const tone = kindToTone(deadline.kind as DeadlineKind);
  const done = deadline.completedAt !== undefined;
  const fromBrightspace = deadline.source === "brightspace";

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        className="mt-0.5"
        checked={setCompleted.isPending ? !done : done}
        disabled={setCompleted.isPending}
        aria-label={done ? `Mark ${deadline.title} not done` : `Mark ${deadline.title} done`}
        onCheckedChange={() =>
          setCompleted.mutate(
            { id: deadline._id, completed: !done },
            { onError: () => toast.error("Couldn't update the deadline") },
          )
        }
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium truncate",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {deadline.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
          <span className={overdue && !done ? "text-destructive" : undefined}>{when}</span>
          {detail && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{detail}</span>
            </>
          )}
          {fromBrightspace && (
            <>
              <span aria-hidden>·</span>
              {deadline.externalUrl ? (
                <a
                  href={deadline.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  Brightspace
                  <ExternalLink className="w-3 h-3" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span>Brightspace</span>
              )}
            </>
          )}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide",
          pillClasses(tone),
        )}
      >
        {kindLabel(deadline.kind as DeadlineKind)}
      </span>
    </div>
  );
}
