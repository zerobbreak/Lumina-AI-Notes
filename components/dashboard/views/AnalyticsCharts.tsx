"use client";

import { useMemo, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { Flame, Target, TriangleAlert } from "lucide-react";

interface AnalyticsChartsProps {
  showAnalytics: boolean;
}

const panelClass =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0 p-4";

function InsightCard({
  title,
  value,
  subtitle,
  icon,
  tone = "muted",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: "muted" | "good" | "warn" | "bad";
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/6"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/6"
        : tone === "bad"
          ? "border-red-500/20 bg-red-500/6"
          : "border-border bg-muted/10 dark:bg-white/4";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:shadow-none dark:ring-0",
        toneClasses,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {subtitle ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="mt-0.5 h-9 w-9 rounded-xl border border-border bg-background/40 dark:bg-white/5 dark:border-white/10 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsCharts({ showAnalytics }: AnalyticsChartsProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const [now, setNow] = useState(() => Date.now());

  const isDark = resolvedTheme === "dark";

  const tooltipContentStyle = useMemo(
    () =>
      isDark
        ? {
            background: "#0b0b12",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "12px",
            color: "#e2e8f0",
          }
        : {
            background: "#ffffff",
            border: "1px solid rgba(15, 23, 42, 0.12)",
            fontSize: "12px",
            color: "#0f172a",
          },
    [isDark],
  );

  const axisStroke = isDark ? "#64748b" : "#64748b";

  useEffect(() => {
    if (!showAnalytics) return;
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, [showAnalytics]);
  
  const heatmapStart = useMemo(() => now - 84 * 24 * 60 * 60 * 1000, [now]);

  const dailyActivity = useQuery(
    api.analytics.getDailyStudyActivity,
    showAnalytics ? { start: heatmapStart, end: now, tzOffsetMinutes } : "skip",
  );

  const burnoutStats = useQuery(
    api.analytics.getBurnoutStats,
    showAnalytics ? { tzOffsetMinutes } : "skip",
  );

  const flashcardDecks = useQuery(
    api.flashcards.getDecks,
    showAnalytics ? {} : "skip",
  );
  const quizDecks = useQuery(api.quizzes.getDecks, showAnalytics ? {} : "skip");

  const primaryDeckId = flashcardDecks?.[0]?._id;
  const primaryQuizDeckId = quizDecks?.[0]?._id;
  
  const deckPerformance = useQuery(
    api.analytics.getDeckPerformance,
    showAnalytics && primaryQuizDeckId ? { deckId: primaryQuizDeckId } : "skip",
  );

  const readinessForecast = useQuery(
    api.analytics.getReadinessForecast,
    showAnalytics && primaryDeckId ? { deckId: primaryDeckId } : "skip",
  );

  const weakTopics = useQuery(
    api.analytics.getWeakTopics,
    showAnalytics && primaryDeckId ? { deckId: primaryDeckId } : "skip",
  );

  const heatmapDays = useMemo(() => {
    if (!dailyActivity) return [];
    const counts = new Map<number, number>();
    dailyActivity.forEach((d) => counts.set(d.date, d.count));
    const days: Array<{ date: number; count: number }> = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const start = new Date(heatmapStart);
    start.setHours(0, 0, 0, 0);
    for (let t = start.getTime(); t <= now; t += dayMs) {
      days.push({ date: t, count: counts.get(t) ?? 0 });
    }
    return days;
  }, [dailyActivity, heatmapStart, now]);

  const last7Days = useMemo(() => {
    if (!dailyActivity) return [];
    const byDate = new Map<number, number>();
    for (const d of dailyActivity) byDate.set(d.date, d.count);

    const dayMs = 24 * 60 * 60 * 1000;
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - 6 * dayMs);

    const points: Array<{ date: number; count: number }> = [];
    for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
      points.push({ date: t, count: byDate.get(t) ?? 0 });
    }
    return points;
  }, [dailyActivity, now]);

  const avgDailyCount = useMemo(() => {
    if (last7Days.length === 0) return 0;
    const sum = last7Days.reduce((acc, p) => acc + p.count, 0);
    return sum / last7Days.length;
  }, [last7Days]);

  if (!showAnalytics) return null;

  const burnoutTone =
    burnoutStats?.level === "high"
      ? ("bad" as const)
      : burnoutStats?.level === "medium"
        ? ("warn" as const)
        : ("good" as const);

  const readinessLabel = readinessForecast?.predictedReadyDate
    ? new Date(readinessForecast.predictedReadyDate).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric" },
      )
    : "—";

  return (
    <>
      {/* Reference-inspired hero: weekly productivity line */}
      <div className={cn(panelClass, "p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Weekly productivity
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {avgDailyCount ? avgDailyCount.toFixed(1) : "0.0"}
              </span>
              <span className="text-xs text-muted-foreground">
                avg activities/day
              </span>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Last 7 days
          </span>
        </div>

        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7Days} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="prodStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                  <stop offset="60%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="prodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={isDark ? 0.25 : 0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)"} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString(undefined, { weekday: "short" })
                }
                stroke={axisStroke}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={axisStroke}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#prodStroke)"
                strokeWidth={2.5}
                fill="url(#prodFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard
          title="Burnout risk"
          value={`${burnoutStats?.streakDays ?? 0}d`}
          subtitle={
            burnoutStats?.level === "high"
              ? "High — take a lighter day"
              : burnoutStats?.level === "medium"
                ? "Moderate — balance workload"
                : "Healthy pace"
          }
          icon={
            burnoutStats?.level === "high" ? (
              <TriangleAlert className="h-4 w-4 text-red-500" aria-hidden />
            ) : (
              <Flame className="h-4 w-4 text-amber-500" aria-hidden />
            )
          }
          tone={burnoutTone}
        />
        <InsightCard
          title="Readiness"
          value={readinessLabel}
          subtitle={`Cards remaining: ${readinessForecast?.cardsRemaining ?? 0}`}
          icon={<Target className="h-4 w-4 text-emerald-600" aria-hidden />}
          tone={readinessForecast?.predictedReadyDate ? "good" : "muted"}
        />
        <InsightCard
          title="Weak topics"
          value={`${weakTopics?.length ?? 0}`}
          subtitle={
            weakTopics && weakTopics.length > 0
              ? `Top: ${weakTopics[0]?.topic ?? "—"}`
              : "No weak topics yet"
          }
          icon={<Target className="h-4 w-4 text-indigo-600" aria-hidden />}
          tone={weakTopics && weakTopics.length > 0 ? "warn" : "muted"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap */}
        <div className={cn(panelClass, "lg:col-span-2")}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Study Heatmap
            </p>
            <span className="text-[10px] text-muted-foreground">
              Last 12 weeks
            </span>
          </div>
          <div className="grid grid-cols-14 gap-1">
            {heatmapDays.map((day) => {
              const count = day.count;
              const intensity =
                count === 0
                  ? isDark
                    ? "bg-white/5"
                    : "bg-muted border border-border/80"
                  : count < 3
                    ? "bg-emerald-500/25 dark:bg-emerald-500/20"
                    : count < 6
                      ? "bg-emerald-500/45 dark:bg-emerald-500/40"
                      : "bg-emerald-600/80 dark:bg-emerald-500/70";
              return (
                <div
                  key={day.date}
                  title={`${new Date(day.date).toLocaleDateString()} · ${count} activities`}
                  className={`h-3 w-3 rounded-sm ${intensity}`}
                />
              );
            })}
          </div>
        </div>

        {/* Burnout Indicator (kept as detailed card) */}
        <div className={panelClass}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Burnout Risk
          </p>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {burnoutStats?.streakDays ?? 0} days
          </div>
          <div className="mt-2 text-xs">
            {burnoutStats?.level === "high" ? (
              <span className="px-2 py-1 rounded-md bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                High risk — consider a rest day
              </span>
            ) : burnoutStats?.level === "medium" ? (
              <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-400">
                Moderate — balance your workload
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-400">
                Healthy pace
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Performance + Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cn(panelClass, "lg:col-span-2")}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Deck Performance
          </p>
          {deckPerformance && deckPerformance.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deckPerformance}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    stroke={axisStroke}
                    fontSize={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke={axisStroke}
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelFormatter={(v) =>
                      new Date(v).toLocaleDateString()
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="scorePercent"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No quiz results yet for performance tracking.
            </p>
          )}
        </div>

        <div className={panelClass}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Readiness Forecast
          </p>
          <div className="mt-3 text-sm text-foreground">
            {readinessForecast?.predictedReadyDate ? (
              <>
                At your current pace, you&apos;ll be ready by{" "}
                <span className="text-emerald-700 font-semibold dark:text-emerald-400">
                  {new Date(
                    readinessForecast.predictedReadyDate,
                  ).toLocaleDateString()}
                </span>
              </>
            ) : (
              "Not enough study data to forecast readiness."
            )}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Cards remaining: {readinessForecast?.cardsRemaining ?? 0}
          </div>
        </div>
      </div>

      {/* Weak Topics */}
      <div className={panelClass}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Weak Topics
          </p>
          {primaryDeckId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard?view=flashcards&deckId=${primaryDeckId}`,
                )
              }
              className="text-xs h-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
            >
              Review weak cards
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {weakTopics && weakTopics.length > 0 ? (
            weakTopics.map((t) => (
              <div
                key={t.cardId}
                className="flex items-center justify-between text-xs text-foreground gap-2"
              >
                <span className="truncate max-w-[70%]">{t.topic}</span>
                <span className="shrink-0 font-medium tabular-nums text-amber-700 dark:text-amber-400">
                  EF {t.easeFactor.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              No weak topics identified yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
