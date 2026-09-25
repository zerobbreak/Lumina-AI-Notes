"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { CalendarToolbar } from "@/components/dashboard/calendar/CalendarToolbar";
import { DayPanel } from "@/components/dashboard/calendar/DayPanel";
import { MonthGrid } from "@/components/dashboard/calendar/MonthGrid";
import { WeekGrid } from "@/components/dashboard/calendar/WeekGrid";
import {
  DEFAULT_FILTERS,
  addDays,
  applyFilters,
  bundleByDay,
  dayKey,
  fromDayKey,
  monthWeeks,
  periodTotals,
  weeksRange,
  type CalendarFilters,
} from "@/lib/calendar/month";
import { weekOf } from "@/lib/calendar/week";
import { useCalendarActivity } from "@/lib/queries/calendar/useCalendarActivity";
import { useDeadlinesInRange } from "@/lib/queries/deadlines/useDeadlinesInRange";
import { useHomeSummary } from "@/lib/queries/home/useHomeSummary";
import { useBrightspaceStatus } from "@/lib/queries/integrations/useBrightspaceStatus";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { useGamification } from "@/lib/queries/users/useGamification";
import type { Course } from "@/types";

function Stat({ value, label, tone }: { value: number | string; label: string; tone?: "critical" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={tone === "critical" && value ? "font-reading text-xl leading-none text-destructive" : "font-reading text-xl leading-none text-foreground"}>
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}

/** "September 20 – 26, 2026" or "20–26 September 2026", in the user's locale. */
function weekTitle(days: Date[]) {
  const format = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" });
  return format.formatRange(days[0]!, days[6]!);
}

/**
 * The calendar: the month grid by default, or the week planner when the
 * user picked it under Appearance. Either way the selected day's detail
 * sits beside it.
 */
export default function CalendarView() {
  const { appearance } = useAppearance();
  const layout = appearance.calendarLayout;
  const { data: userData } = useCurrentUser();
  const { data: gamification } = useGamification();
  const { data: home } = useHomeSummary();
  const { data: brightspace } = useBrightspaceStatus();
  const [now] = useState(() => Date.now());
  const todayKey = dayKey(now);

  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);
  const quickAddRef = useRef<HTMLInputElement>(null);

  const selected = fromDayKey(selectedKey);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const weekStartKey = dayKey(weekOf(selected)[0]!);

  const weeks = useMemo(
    () => (layout === "week" ? [weekOf(fromDayKey(weekStartKey))] : monthWeeks(year, month)),
    [layout, weekStartKey, year, month],
  );
  const range = useMemo(() => weeksRange(weeks), [weeks]);
  const periodDays = useMemo(
    () => (layout === "week" ? weeks[0]! : weeks.flat().filter((d) => d.getMonth() === month)),
    [layout, weeks, month],
  );

  const { data: activity, isLoading: activityLoading } = useCalendarActivity(range);
  const { data: deadlines, isLoading: deadlinesLoading } = useDeadlinesInRange(range);

  const courses: Course[] = useMemo(() => userData?.courses ?? [], [userData]);
  const courseOf = useCallback(
    (courseId: string | null | undefined) => (courseId ? courses.find((c) => c.id === courseId) : undefined),
    [courses],
  );

  const byDay = useMemo(
    () =>
      bundleByDay({
        deadlines: applyFilters(deadlines ?? [], filters),
        recordings: activity?.recordings ?? [],
        notes: (activity?.notes ?? []).filter((n) => !filters.hiddenCourses.includes(n.courseId ?? "none")),
        study: activity?.study ?? [],
      }),
    [activity, deadlines, filters],
  );
  const totals = useMemo(() => periodTotals(periodDays, byDay, now), [periodDays, byDay, now]);
  const plan = useMemo(() => home?.plan ?? [], [home]);

  const selectDate = useCallback((date: Date) => setSelectedKey(dayKey(date)), []);
  const shift = (delta: number) => {
    if (layout === "week") {
      setSelectedKey(dayKey(addDays(selected, delta * 7)));
      return;
    }
    const target = new Date(year, month + delta, 1);
    const today = new Date(now);
    // Land on today in the current month, else on the 1st.
    const sameMonth = target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
    setSelectedKey(dayKey(sameMonth ? today : target));
  };

  const title =
    layout === "week"
      ? weekTitle(weeks[0]!)
      : new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const period = layout === "week" ? "this week" : "this month";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <CalendarToolbar
        title={title}
        unit={layout}
        courses={courses}
        filters={filters}
        brightspace={brightspace}
        now={now}
        onShift={shift}
        onToday={() => setSelectedKey(todayKey)}
        onAdd={() => quickAddRef.current?.focus()}
        onFilters={setFilters}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 flex-col gap-3 border-b border-border p-4 md:px-8 lg:flex-1 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {(activityLoading || deadlinesLoading) && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading your {layout}…
            </p>
          )}
          {layout === "week" ? (
            <WeekGrid
              days={weeks[0]!}
              byDay={byDay}
              selectedKey={selectedKey}
              todayKey={todayKey}
              showActivity={filters.activity}
              plan={plan}
              courseOf={courseOf}
              now={now}
              onSelect={selectDate}
            />
          ) : (
            <MonthGrid
              weeks={weeks}
              month={month}
              byDay={byDay}
              selectedKey={selectedKey}
              todayKey={todayKey}
              showActivity={filters.activity}
              courseOf={courseOf}
              now={now}
              onSelect={selectDate}
            />
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            <Stat value={totals.due} label={`due ${period}`} />
            <Stat value={totals.done} label="handed in" />
            <Stat value={totals.overdue} label="overdue" tone="critical" />
            <Stat value={totals.studyDays} label="days studied" />
            <span className="ml-auto flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500" aria-hidden />
              <span>
                <span className="font-semibold tabular-nums text-foreground">{gamification?.currentStreak ?? 0}</span>-day
                streak · best {gamification?.longestStreak ?? 0}
              </span>
            </span>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col bg-card/40 lg:w-[400px] lg:shrink-0 xl:w-[440px]">
          <DayPanel
            ref={quickAddRef}
            date={selected}
            isToday={selectedKey === todayKey}
            bundle={byDay.get(selectedKey)}
            showActivity={filters.activity}
            plan={plan}
            pulses={home?.courses ?? []}
            courses={courses}
            courseOf={courseOf}
            now={now}
          />
        </div>
      </div>
    </div>
  );
}
