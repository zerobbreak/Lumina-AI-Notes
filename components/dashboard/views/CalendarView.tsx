"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Mic,
  FileText,
  Clock,
  Flame,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

function localDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDuration(sec: number | undefined): string {
  if (sec === undefined || !Number.isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${s}s`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export default function CalendarView() {
  const router = useRouter();
  const userData = useQuery(api.users.getUser);
  const gamification = useQuery(api.users.getUserGamificationStats);

  const [todayParts] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  });

  const [cal, setCal] = useState(() => {
    const n = new Date();
    return {
      cursor: { y: n.getFullYear(), m: n.getMonth() },
      selectedDay: n.getDate(),
    };
  });

  const { cursor } = cal;
  const safeDay = Math.min(
    cal.selectedDay,
    daysInMonth(cursor.y, cursor.m),
  );
  const selectedKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

  const todayKey = `${todayParts.y}-${String(todayParts.m + 1).padStart(2, "0")}-${String(todayParts.d).padStart(2, "0")}`;

  const range = useMemo(() => {
    const startMs = new Date(cursor.y, cursor.m, 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(cursor.y, cursor.m + 1, 0, 23, 59, 59, 999).getTime();
    return { startMs, endMs };
  }, [cursor.y, cursor.m]);

  const activity = useQuery(api.calendar.getCalendarActivity, range);

  const byDay = useMemo(() => {
    const map = new Map<
      string,
      { recordings: Doc<"recordings">[]; notes: Doc<"notes">[] }
    >();

    if (!activity) return map;

    for (const r of activity.recordings) {
      const k = localDayKey(r.createdAt);
      const cur = map.get(k) ?? { recordings: [], notes: [] };
      cur.recordings.push(r);
      map.set(k, cur);
    }
    for (const n of activity.notes) {
      const k = localDayKey(n.createdAt);
      const cur = map.get(k) ?? { recordings: [], notes: [] };
      cur.notes.push(n);
      map.set(k, cur);
    }
    return map;
  }, [activity]);

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const gridDays = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startPad = first.getDay();
    const dim = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: { day: number | null; key: string | null }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ day: null, key: null });
    }
    for (let d = 1; d <= dim; d++) {
      const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, key });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, key: null });
    }
    return cells;
  }, [cursor.y, cursor.m]);

  const goPrev = useCallback(() => {
    setCal((s) => {
      const c = s.cursor;
      const next =
        c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 };
      const t = new Date();
      const inMonth =
        t.getFullYear() === next.y && t.getMonth() === next.m;
      const dim = daysInMonth(next.y, next.m);
      const day = inMonth ? Math.min(t.getDate(), dim) : 1;
      return { cursor: next, selectedDay: day };
    });
  }, []);

  const goNext = useCallback(() => {
    setCal((s) => {
      const c = s.cursor;
      const next =
        c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 };
      const t = new Date();
      const inMonth =
        t.getFullYear() === next.y && t.getMonth() === next.m;
      const dim = daysInMonth(next.y, next.m);
      const day = inMonth ? Math.min(t.getDate(), dim) : 1;
      return { cursor: next, selectedDay: day };
    });
  }, []);

  const goToday = useCallback(() => {
    const t = new Date();
    setCal({
      cursor: { y: t.getFullYear(), m: t.getMonth() },
      selectedDay: t.getDate(),
    });
  }, []);

  const selectedBundle = byDay.get(selectedKey);

  const courseName = useCallback(
    (courseId: string | undefined) => {
      if (!courseId || !userData?.courses) return null;
      const c = userData.courses.find((x: Course) => x.id === courseId);
      return c ? `${c.code} · ${c.name}` : null;
    },
    [userData],
  );

  if (activity === undefined) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-background min-h-0">
      <div className="shrink-0 border-b border-border px-4 py-4 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Activity calendar
            </h1>
            <p className="text-sm text-muted-foreground">
              Sessions and notes by day — keep your streak going.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-2 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Streak
              </div>
              <div className="text-lg font-bold tabular-nums leading-none">
                {gamification?.currentStreak ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  days
                </span>
              </div>
            </div>
            <div className="pl-3 ml-1 border-l border-border text-[11px] text-muted-foreground">
              Best {gamification?.longestStreak ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="lg:w-[min(100%,520px)] shrink-0 border-b lg:border-b-0 lg:border-r border-border p-4 md:p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-semibold text-foreground capitalize">{monthLabel}</div>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="secondary" size="sm" className="mb-4 self-start" onClick={goToday}>
            Today
          </Button>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 font-medium">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((cell, idx) => {
              if (cell.day === null || !cell.key) {
                return <div key={`pad-${idx}`} className="aspect-square min-h-[36px]" />;
              }
              const bundle = byDay.get(cell.key);
              const recN = bundle?.recordings.length ?? 0;
              const noteN = bundle?.notes.length ?? 0;
              const total = recN + noteN;
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedKey;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() =>
                    setCal((s) => ({ ...s, selectedDay: cell.day! }))
                  }
                  className={cn(
                    "aspect-square min-h-[36px] rounded-lg text-sm font-medium transition-colors flex flex-col items-center justify-center gap-0.5",
                    "hover:bg-accent",
                    isToday && "ring-2 ring-primary/50",
                    isSelected && "bg-accent text-accent-foreground",
                    !isSelected && !isToday && "text-foreground",
                  )}
                >
                  <span>{cell.day}</span>
                  {total > 0 && (
                    <span className="flex gap-0.5">
                      {recN > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" title="Recordings" />
                      )}
                      {noteN > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Notes" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Session
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Note
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          <div className="px-4 py-3 md:px-6 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-foreground">
              {new Date(selectedKey + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
            {!selectedBundle ||
            (selectedBundle.recordings.length === 0 && selectedBundle.notes.length === 0) ? (
              <p className="text-xs text-muted-foreground mt-1">No activity on this day.</p>
            ) : null}
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 md:p-6 space-y-8">
              {selectedBundle && selectedBundle.recordings.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5" />
                    Sessions
                  </h3>
                  <ul className="space-y-2">
                    {selectedBundle.recordings.map((r) => (
                      <li
                        key={r._id}
                        className="rounded-lg border border-border bg-card/50 px-3 py-2.5 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            {new Date(r.createdAt).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {formatDuration(r.duration) ? ` · ${formatDuration(r.duration)}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedBundle && selectedBundle.notes.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Notes
                  </h3>
                  <ul className="space-y-2">
                    {selectedBundle.notes.map((n) => {
                      const cnLabel = courseName(n.courseId);
                      const inProgress = n.quickCaptureStatus === "draft";
                      return (
                        <li key={n._id}>
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard?noteId=${n._id}`)}
                            className="w-full text-left rounded-lg border border-border bg-card/50 px-3 py-2.5 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                              {inProgress && (
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                  In progress
                                </span>
                              )}
                            </div>
                            {cnLabel && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {cnLabel}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
