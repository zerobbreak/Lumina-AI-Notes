import { ArrowRight, Brain, GraduationCap, Layers, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type RecentNoteLike = {
  _id: Id<"notes">;
  title: string;
  createdAt: number;
};

export function StudyNextActions({
  dueTodayCount,
  streakDays,
  recentNote,
  onStartFlashcards,
  onOpenRecentNote,
  className,
}: {
  dueTodayCount: number;
  streakDays: number;
  recentNote?: RecentNoteLike;
  onStartFlashcards: () => void;
  onOpenRecentNote: (id: Id<"notes">) => void;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden />
          Continue studying
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Next best actions based on your habits.
        </p>
      </div>

      <div className="space-y-3">
        {/* Primary CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Daily review
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dueTodayCount > 0
                  ? `${dueTodayCount} card${dueTodayCount === 1 ? "" : "s"} due today`
                  : "Nothing due — keep the streak alive with a quick session"}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button onClick={onStartFlashcards} className="h-9">
                  <Layers className="w-4 h-4 mr-2" aria-hidden />
                  Start reviewing
                </Button>
                <div className="text-[11px] text-muted-foreground">
                  Streak:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {streakDays}
                  </span>{" "}
                  days
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-center h-11 w-11 rounded-xl border border-border bg-muted/20 dark:bg-white/5">
              <GraduationCap className="w-5 h-5 text-cyan-700 dark:text-cyan-300" aria-hidden />
            </div>
          </div>
        </div>

        {/* Secondary suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
              Focus sprint
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Try a 25-minute deep work block and log it.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
              onClick={() => {}}
            >
              Start timer
              <ArrowRight className="w-3 h-3 ml-1" aria-hidden />
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Resume writing
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
              {recentNote ? `Open “${recentNote.title}” and keep momentum.` : "Jump back into your last note."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
              onClick={() => recentNote && onOpenRecentNote(recentNote._id)}
              disabled={!recentNote}
            >
              Open note
              <ArrowRight className="w-3 h-3 ml-1" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

