"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function scoreTone(pct: number) {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatWhen(completedAt: number) {
  const days = Math.floor((Date.now() - completedAt) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(completedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function QuizSnapshot({
  onOpenQuizzes,
  className,
}: {
  onOpenQuizzes: () => void;
  className?: string;
}) {
  const latest = useQuery(api.quizzes.getLatestResultForUser);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
          Quiz performance
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
          onClick={onOpenQuizzes}
        >
          {latest ? "Retake" : "Start"}
          <ArrowRight className="w-3 h-3 ml-1" aria-hidden />
        </Button>
      </div>

      <div className="mt-4">
        {latest === undefined ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : !latest ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No quizzes taken yet.</p>
            <p className="text-xs text-muted-foreground">
              Generate a quiz from any note to test your recall.
            </p>
          </div>
        ) : (
          (() => {
            const pct = Math.round((latest.score / latest.totalQuestions) * 100);
            return (
              <div className="flex items-center gap-4">
                <div className={cn("text-3xl font-semibold tabular-nums", scoreTone(pct))}>
                  {pct}%
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {latest.deckTitle}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {latest.score}/{latest.totalQuestions} correct · {formatWhen(latest.completedAt)}
                  </p>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </section>
  );
}
