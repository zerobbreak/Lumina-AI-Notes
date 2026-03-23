"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsChartsProps {
  showAnalytics: boolean;
}

export default function AnalyticsCharts({ showAnalytics }: AnalyticsChartsProps) {
  const router = useRouter();
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const [now, setNow] = useState(() => Date.now());
  
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

  if (!showAnalytics) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Study Heatmap
            </p>
            <span className="text-[10px] text-gray-500">
              Last 12 weeks
            </span>
          </div>
          <div className="grid grid-cols-14 gap-1">
            {heatmapDays.map((day) => {
              const count = day.count;
              const intensity =
                count === 0
                  ? "bg-white/5"
                  : count < 3
                    ? "bg-emerald-500/20"
                    : count < 6
                      ? "bg-emerald-500/40"
                      : "bg-emerald-500/70";
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

        {/* Burnout Indicator */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Burnout Risk
          </p>
          <div className="mt-3 text-3xl font-bold text-white">
            {burnoutStats?.streakDays ?? 0} days
          </div>
          <div className="mt-2 text-xs">
            {burnoutStats?.level === "high" ? (
              <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                High risk — consider a rest day
              </span>
            ) : burnoutStats?.level === "medium" ? (
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">
                Moderate — balance your workload
              </span>
            ) : (
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                Healthy pace
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Performance + Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
                    stroke="#64748b"
                    fontSize={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748b"
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0b0b12",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "12px",
                    }}
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
            <p className="text-xs text-gray-500">
              No quiz results yet for performance tracking.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Readiness Forecast
          </p>
          <div className="mt-3 text-sm text-gray-300">
            {readinessForecast?.predictedReadyDate ? (
              <>
                At your current pace, you&apos;ll be ready by{" "}
                <span className="text-emerald-400 font-semibold">
                  {new Date(
                    readinessForecast.predictedReadyDate,
                  ).toLocaleDateString()}
                </span>
              </>
            ) : (
              "Not enough study data to forecast readiness."
            )}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Cards remaining: {readinessForecast?.cardsRemaining ?? 0}
          </div>
        </div>
      </div>

      {/* Weak Topics */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
              className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
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
                className="flex items-center justify-between text-xs text-gray-300"
              >
                <span className="truncate max-w-[70%]">{t.topic}</span>
                <span className="text-amber-400">
                  EF {t.easeFactor.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">
              No weak topics identified yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
