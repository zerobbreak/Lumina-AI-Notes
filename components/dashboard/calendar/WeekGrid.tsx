"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { dayKey, isWork, type DayBundle } from "@/lib/calendar/month";
import { planCourseId, planTitle } from "@/lib/calendar/planItems";
import { busyTimes, dayBlocks, fitPlan, hourSpan, type Block } from "@/lib/calendar/week";
import { formatMinutes, planAction } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { PlanItemDto } from "@/types/api/home";
import { courseColor, type CourseLookup } from "@/components/dashboard/home/parts";
import { DeadlineChip } from "./MonthGrid";

const HOUR_PX = 44;
const MINUTE_PX = HOUR_PX / 60;

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function BlockView({ block, first, courseOf }: { block: Block; first: number; courseOf: CourseLookup }) {
  const top = (block.start - first * 60) * MINUTE_PX;
  const height = Math.max(20, (block.end - block.start) * MINUTE_PX - 2);
  const width = 100 / block.lanes;
  const position = {
    top,
    height,
    left: `calc(${block.lane * width}% + 2px)`,
    width: `calc(${width}% - 4px)`,
  };
  const minutes = block.end - block.start;
  const tall = height >= 40;

  if (block.kind === "suggested" && block.plan) {
    const item: PlanItemDto = block.plan;
    const color = courseColor(courseOf(planCourseId(item)));
    const action = planAction(item);
    const body = (
      <>
        <span className="block text-[9px] font-bold uppercase tracking-[0.06em] opacity-80">
          Suggested · {formatMinutes(minutes)}
        </span>
        <span className="block truncate font-semibold">{planTitle(item)}</span>
      </>
    );
    const className =
      "absolute overflow-hidden rounded-md border-[1.5px] border-dashed bg-card px-1.5 py-1 text-[11px] leading-[14px] transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-inset";
    const style = { ...position, borderColor: color, color };
    if (!action) return <div className={className} style={style}>{body}</div>;
    return action.external ? (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className} style={style} title={action.label}>
        {body}
      </a>
    ) : (
      <Link href={action.href} className={className} style={style} title={action.label}>
        {body}
      </Link>
    );
  }

  if (block.kind === "event") {
    const color = courseColor(courseOf(block.courseId));
    return (
      <div
        className="absolute overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-[14px] text-foreground"
        style={{
          ...position,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        }}
      >
        <span className="block truncate font-semibold">{block.title}</span>
        {tall && <span className="block text-muted-foreground">{clock(block.start)}</span>}
      </div>
    );
  }

  return (
    <div
      className="absolute overflow-hidden rounded-md border border-border bg-muted px-1.5 py-1 text-[11px] leading-[14px] text-foreground"
      style={position}
    >
      <span className="block text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Recorded · {formatMinutes(Math.max(1, minutes))}
      </span>
      {tall && <span className="block truncate font-medium">{block.title}</span>}
    </div>
  );
}

/**
 * The week by the hour: classes and events from the calendar, the sessions
 * you recorded, and today's plan fitted into the free time after now.
 * Deadlines, mostly due at midnight, sit in a row above the hours.
 */
export function WeekGrid({
  days,
  byDay,
  selectedKey,
  todayKey,
  showActivity,
  plan,
  courseOf,
  now,
  onSelect,
}: {
  days: Date[];
  byDay: Map<string, DayBundle>;
  selectedKey: string;
  todayKey: string;
  showActivity: boolean;
  plan: PlanItemDto[];
  courseOf: CourseLookup;
  now: number;
  onSelect: (date: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = days.find((d) => dayKey(d) === todayKey);
  const nowMinutes = today ? Math.round((now - today.getTime()) / 60_000) : null;

  const { columns, unplaced, span } = useMemo(() => {
    let fit: ReturnType<typeof fitPlan> = { placed: [], unplaced: [] };
    if (today && nowMinutes !== null) {
      fit = fitPlan(plan, busyTimes(today, byDay.get(todayKey)), nowMinutes);
    }
    const columns = days.map((day) => {
      const key = dayKey(day);
      const bundle = byDay.get(key);
      return {
        day,
        key,
        due: (bundle?.deadlines ?? []).filter(isWork),
        blocks: dayBlocks(day, bundle, { showActivity, suggestions: key === todayKey ? fit.placed : undefined }),
      };
    });
    return { columns, unplaced: fit.unplaced, span: hourSpan(columns.flatMap((c) => c.blocks)) };
  }, [days, byDay, plan, showActivity, today, todayKey, nowMinutes]);

  const hours = Array.from({ length: span.last - span.first }, (_, i) => span.first + i);

  // Open on the part of the day that matters: an hour before now, or 08:00.
  useEffect(() => {
    const target = nowMinutes !== null ? nowMinutes / 60 - 1 : 8;
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (target - span.first) * HOUR_PX);
    // Only when the week changes, not on every data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.getTime()]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-x-1 pb-1.5">
        <span />
        {columns.map(({ day, key }) => {
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={key === selectedKey}
              aria-current={isToday ? "date" : undefined}
              onClick={() => onSelect(day)}
              className={cn(
                "flex items-baseline gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                key === selectedKey && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.06em]",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className={cn("font-reading text-lg leading-none", isToday ? "text-primary" : "text-foreground")}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-x-1 border-y border-border py-1.5">
        <span className="pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Due</span>
        {columns.map(({ key, due }) => (
          <div key={key} className="flex min-h-[26px] min-w-0 flex-col gap-0.5">
            {due.map((d) => (
              <DeadlineChip key={d._id} deadline={d} courseOf={courseOf} now={now} />
            ))}
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="relative min-h-[320px] flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-x-1"
          style={{ height: hours.length * HOUR_PX }}
        >
          <div className="relative">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: (h - span.first) * HOUR_PX }}
              >
                {h === span.first ? "" : clock(h * 60)}
              </span>
            ))}
          </div>
          {columns.map(({ key, blocks }) => (
            <div
              key={key}
              className={cn("relative border-l border-border/70", key === todayKey && "bg-primary/[0.03]")}
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, hsl(var(--border) / 0.6) 0, hsl(var(--border) / 0.6) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
              }}
            >
              {blocks.map((b) => (
                <BlockView key={b.id} block={b} first={span.first} courseOf={courseOf} />
              ))}
              {key === todayKey && nowMinutes !== null && (
                <div
                  className="pointer-events-none absolute inset-x-0 h-0.5 bg-primary"
                  style={{ top: (nowMinutes - span.first * 60) * MINUTE_PX }}
                  aria-hidden
                >
                  <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {unplaced.length > 0 && (
        <p className="border-t border-border pt-2 text-xs text-muted-foreground">
          No room left today for {unplaced.map(planTitle).join(", ")}.
        </p>
      )}
    </div>
  );
}
