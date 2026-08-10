import { Layers, Clock } from "lucide-react";

interface DashboardSkeletonProps {
  /** First name to greet with immediately, e.g. from Clerk, before Convex data loads. */
  name?: string | null;
}

/**
 * Mirrors SmartFolderHub's real layout (hero + stat cards + notes rail +
 * study actions + courses grid) so the dashboard has visible structure and,
 * when available, a personalized greeting instead of a blank screen while
 * data loads.
 */
export function DashboardSkeleton({ name }: DashboardSkeletonProps) {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-10">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-7 lg:p-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/12" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            {name ? (
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-700 to-blue-700 dark:from-cyan-400 dark:to-blue-500">
                  {name}
                </span>
              </h1>
            ) : (
              <div className="h-11 lg:h-12 w-72 max-w-full rounded-xl bg-foreground/10 animate-pulse" />
            )}
            <p className="text-muted-foreground text-lg max-w-xl">
              Your academic workspace is ready. Pick up where you left off or
              start something new.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="rounded-2xl border border-border bg-card px-5 py-4 min-w-[200px] shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0 dark:backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                <Layers className="w-4 h-4 shrink-0" aria-hidden />
                Cards Due Today
              </div>
              <div className="mt-2 h-8 w-12 rounded-lg bg-foreground/10 animate-pulse" />
            </div>
            <div className="rounded-2xl border border-border bg-card px-5 py-4 min-w-[200px] shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0 dark:backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
                <Clock className="w-4 h-4 shrink-0" aria-hidden />
                Study Streak
              </div>
              <div className="mt-2 h-8 w-12 rounded-lg bg-foreground/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Notes rail */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-black/40 space-y-4">
        <div className="h-4 w-28 rounded bg-foreground/10 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 w-48 shrink-0 rounded-xl bg-foreground/5 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Study actions + panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-40 rounded-2xl border border-border bg-card shadow-sm dark:border-white/10 dark:bg-black/40 animate-pulse" />
        <div className="h-40 rounded-2xl border border-border bg-card shadow-sm dark:border-white/10 dark:bg-black/40 animate-pulse" />
      </div>

      {/* Courses grid */}
      <div>
        <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card shadow-sm dark:border-white/10 dark:bg-black/40 p-5 min-h-[150px] space-y-4"
            >
              <div className="w-10 h-10 rounded-lg bg-foreground/10 animate-pulse" />
              <div className="h-5 w-3/4 rounded bg-foreground/10 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-foreground/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
