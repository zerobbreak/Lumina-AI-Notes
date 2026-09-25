"use client";

import { useRef, type KeyboardEvent } from "react";
import { FileText, Mic } from "lucide-react";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";
import {
  addDays,
  dayKey,
  isDone,
  isOverdue,
  isoWeek,
  studyLine,
  studyMinutes,
  weekLoad,
  type DayBundle,
} from "@/lib/calendar/month";
import { cn } from "@/lib/utils";
import { courseColor, type CourseLookup } from "@/components/dashboard/home/parts";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Chips shown in a day before it says "+N more". */
const MAX_CHIPS = 2;
/** A day with this much study fills its bar. */
const FULL_BAR_MINUTES = 90;

const ARROW_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

function Chip({ deadline, courseOf, now }: { deadline: DeadlineModel; courseOf: CourseLookup; now: number }) {
  const color = courseColor(courseOf(deadline.courseId));
  const done = isDone(deadline);
  const overdue = isOverdue(deadline, now);
  const past = deadline.kind === "event" && deadline.dueAt < now;
  const time = new Date(deadline.dueAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  let style: React.CSSProperties | undefined;
  let tone = "";
  if (overdue) tone = "bg-destructive/10 text-destructive";
  else if (done || past) tone = cn("text-muted-foreground", done && "line-through");
  else if (deadline.kind === "exam") style = { background: color, color: "hsl(var(--card))" };
  else if (deadline.kind === "event") style = { color };
  else style = { background: `color-mix(in srgb, ${color} 13%, transparent)`, color };

  return (
    <span
      className={cn("block truncate rounded-[5px] px-1.5 py-px text-[11px] font-medium leading-[15px]", tone)}
      style={style}
    >
      {overdue && "! "}
      {deadline.kind === "event" && `${time} `}
      {deadline.title}
    </span>
  );
}

function DayCell({
  date,
  bundle,
  inMonth,
  selected,
  today,
  showActivity,
  courseOf,
  now,
  onSelect,
}: {
  date: Date;
  bundle?: DayBundle;
  inMonth: boolean;
  selected: boolean;
  today: boolean;
  showActivity: boolean;
  courseOf: CourseLookup;
  now: number;
  onSelect: (date: Date) => void;
}) {
  const deadlines = bundle?.deadlines ?? [];
  const minutes = bundle && showActivity ? studyMinutes(bundle.study) : 0;
  const hasRecordings = showActivity && (bundle?.recordings.length ?? 0) > 0;
  const hasNotes = showActivity && (bundle?.notes.length ?? 0) > 0;
  const extra = deadlines.length - MAX_CHIPS;
  const study = bundle && showActivity ? studyLine(bundle.study) : null;
  const label = [
    date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    deadlines.length ? `${deadlines.length} due` : null,
    study,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      data-day={dayKey(date)}
      tabIndex={selected ? 0 : -1}
      aria-label={label}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={() => onSelect(date)}
      className={cn(
        "relative flex min-h-[58px] min-w-0 flex-col gap-1 overflow-hidden rounded-lg border p-1.5 pb-2.5 text-left transition-colors sm:min-h-[104px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        inMonth ? "border-border/70 bg-card hover:bg-accent/40 dark:bg-inset" : "border-transparent bg-transparent hover:bg-accent/30",
        selected && "border-foreground shadow-[0_0_0_1px_hsl(var(--foreground))]",
      )}
    >
      <span className="flex w-full items-center justify-between">
        <span
          className={cn(
            "grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-xs font-semibold tabular-nums",
            today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          {date.getDate()}
        </span>
        <span className="hidden items-center gap-0.5 text-muted-foreground sm:flex" aria-hidden>
          {hasRecordings && <Mic className="h-3 w-3" />}
          {hasNotes && <FileText className="h-3 w-3" />}
        </span>
      </span>

      {/* Phones get dots; there's no room for titles. */}
      {deadlines.length > 0 && (
        <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
          {deadlines.slice(0, 3).map((d) => (
            <span
              key={d._id}
              className={cn("h-1.5 w-1.5 rounded-full", isOverdue(d, now) && "bg-destructive")}
              style={isOverdue(d, now) ? undefined : { background: courseColor(courseOf(d.courseId)), opacity: isDone(d) ? 0.4 : 1 }}
            />
          ))}
        </span>
      )}
      <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden>
        {deadlines.slice(0, MAX_CHIPS).map((d) => (
          <Chip key={d._id} deadline={d} courseOf={courseOf} now={now} />
        ))}
        {extra > 0 && <span className="pl-0.5 text-[11px] text-muted-foreground">+{extra} more</span>}
      </span>

      {showActivity && inMonth && (
        <span className="absolute inset-x-1.5 bottom-1 h-[3px] rounded-full bg-muted" aria-hidden>
          <span
            className="block h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
            style={{ width: `${Math.min(100, Math.round((minutes / FULL_BAR_MINUTES) * 100))}%` }}
          />
        </span>
      )}
    </button>
  );
}

/**
 * The month as a grid of days, a week column on the left saying how much is
 * due each week. Arrow keys move the selected day.
 */
export function MonthGrid({
  weeks,
  month,
  byDay,
  selectedKey,
  todayKey,
  showActivity,
  courseOf,
  now,
  onSelect,
}: {
  weeks: Date[][];
  month: number;
  byDay: Map<string, DayBundle>;
  selectedKey: string;
  todayKey: string;
  showActivity: boolean;
  courseOf: CourseLookup;
  now: number;
  onSelect: (date: Date) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const next = addDays(new Date(`${selectedKey}T12:00:00`), step);
    onSelect(next);
    // The day may be in another month, which re-renders the grid first.
    requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${dayKey(next)}"]`)?.focus(),
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:grid-cols-[40px_repeat(7,minmax(0,1fr))] sm:gap-1.5">
        <span className="hidden sm:block">Wk</span>
        {WEEKDAYS.map((d) => (
          <span key={d} className="px-1">
            {d}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        role="group"
        aria-label="Days of the month"
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-1 sm:grid-cols-[40px_repeat(7,minmax(0,1fr))] sm:gap-1.5"
      >
        {weeks.map((week) => {
          const load = weekLoad(week, byDay);
          return [
            <div key={`w-${dayKey(week[0]!)}`} className="hidden flex-col justify-center gap-0.5 text-[11px] sm:flex">
              <span className="font-semibold text-foreground">W{isoWeek(week[1]!)}</span>
              <span
                className={cn(load.crunch ? "font-bold text-destructive" : "text-muted-foreground")}
                title={load.crunch ? "A heavy week" : undefined}
              >
                {load.count === 0 ? "clear" : `${load.count} due`}
              </span>
            </div>,
            ...week.map((date) => {
              const key = dayKey(date);
              return (
                <DayCell
                  key={key}
                  date={date}
                  bundle={byDay.get(key)}
                  inMonth={date.getMonth() === month}
                  selected={key === selectedKey}
                  today={key === todayKey}
                  showActivity={showActivity}
                  courseOf={courseOf}
                  now={now}
                  onSelect={onSelect}
                />
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}
