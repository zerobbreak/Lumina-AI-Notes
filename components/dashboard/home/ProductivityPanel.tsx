import { ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductivityPanel({
  showAnalytics,
  onToggle,
  children,
  headlineMetric,
  className,
}: {
  showAnalytics: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headlineMetric?: { value: string; label: string };
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
          Productivity analytics
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-xs h-8 text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
        >
          {showAnalytics ? "Hide" : "Show"}
          <ArrowRight
            className={cn(
              "w-3 h-3 ml-1 transition-transform",
              showAnalytics && "rotate-90",
            )}
            aria-hidden
          />
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0 overflow-hidden">
        {/* Reference-inspired hero header */}
        <div className="relative p-5">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
            <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {headlineMetric?.value ?? "—"}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {headlineMetric?.label ?? "Avg focus time"}
              </div>
              <p className="mt-3 text-xs text-muted-foreground max-w-[46ch]">
                Trends and study health are computed from your activity. Expand for heatmaps, performance, and readiness.
              </p>
            </div>

            <div className="hidden sm:flex items-center justify-center h-11 w-11 rounded-2xl border border-border bg-muted/20 dark:bg-white/5">
              <TrendingUp className="w-5 h-5 text-indigo-700 dark:text-indigo-300" aria-hidden />
            </div>
          </div>
        </div>

        {/* Expanded analytics content (existing charts component) */}
        {showAnalytics ? (
          <div className="p-4 pt-0">{children}</div>
        ) : (
          <div className="px-5 pb-5">
            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground dark:bg-white/3 dark:border-white/10">
              Click “Show” to load interactive charts (lazy-loaded to avoid extra reads).
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

