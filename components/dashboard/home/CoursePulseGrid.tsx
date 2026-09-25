"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { dueLabel, pulseReason, timeAgo } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import type { CoursePulseDto, PulseStatus } from "@/types/api/home";
import { Chip, Eyebrow, courseColor, courseLabel, type Tone } from "./parts";

type SortMode = "attention" | "deadline" | "code";

const STATUS: Record<PulseStatus, { label: string; tone: Tone }> = {
  behind: { label: "Behind", tone: "critical" },
  attention: { label: "Needs attention", tone: "warning" },
  quiet: { label: "Quiet", tone: "neutral" },
  "on-track": { label: "On track", tone: "good" },
};
const RANK: Record<PulseStatus, number> = { behind: 0, attention: 1, quiet: 2, "on-track": 3 };

const percent = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);

/** Recall per week as a line; gaps where a week had too few reviews. */
export function Sparkline({ trend, color }: { trend: Array<number | null>; color: string }) {
  const points = trend.map((v, i) => (v === null ? null : { x: 4 + (i * 252) / (trend.length - 1), y: 40 - v * 36 }));
  const drawn = points.filter((p): p is { x: number; y: number } => p !== null);
  if (drawn.length < 2) {
    return <p className="flex h-11 items-center text-xs text-muted-foreground">Not enough reviews yet to show a trend.</p>;
  }
  const path = points
    .map((p, i) => (p ? `${i === 0 || !points[i - 1] ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ""))
    .join(" ");
  const last = drawn[drawn.length - 1]!;
  const values = trend.filter((v): v is number => v !== null);
  return (
    <svg
      viewBox="0 0 260 44"
      preserveAspectRatio="none"
      className="block h-11 w-full"
      role="img"
      aria-label={`Recall over the last ${trend.length} weeks, from ${percent(values[0]!)} to ${percent(values[values.length - 1]!)}`}
    >
      <line x1="0" x2="260" y1="22" y2="22" stroke="hsl(var(--border))" strokeWidth="1" />
      <path d={`M${drawn[0]!.x} 44 ${drawn.map((p) => `L${p.x} ${p.y}`).join(" ")} L${last.x} 44 Z`} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="3.5" fill={color} />
    </svg>
  );
}

function PulseCard({
  course,
  pulse,
  now,
  onRename,
  onDelete,
}: {
  course: Course;
  pulse: CoursePulseDto;
  now: number;
  onRename: () => void;
  onDelete: () => void;
}) {
  const color = courseColor(course);
  const status = STATUS[pulse.status];
  const href = `/dashboard?contextId=${course.id}&contextType=course`;

  return (
    <article
      className="group flex flex-col gap-3.5 rounded-xl border border-border border-t-[3px] bg-card p-5 shadow-sm dark:bg-inset dark:shadow-none"
      style={{ borderTopColor: color }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <span className="font-mono text-[11.5px] text-muted-foreground">{courseLabel(course)}</span>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            <Link href={href} className="hover:underline focus-visible:outline-none focus-visible:underline">
              {course.name}
            </Link>
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Chip tone={status.tone}>{status.label}</Chip>
          <div className="opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <ActionMenu onRename={onRename} onDelete={onDelete} align="right" />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2.5 border-y border-border/70 py-3">
        <div className="flex flex-col-reverse">
          <dt className="text-[11.5px] text-muted-foreground">ready for next deadline</dt>
          <dd className="font-mono text-lg font-medium text-foreground">{percent(pulse.readiness)}</dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-[11.5px] text-muted-foreground">card recall</dt>
          <dd className="font-mono text-lg font-medium text-foreground">{percent(pulse.recall)}</dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-[11.5px] text-muted-foreground">notes</dt>
          <dd className="font-mono text-lg font-medium text-foreground">{pulse.noteCount}</dd>
        </div>
      </dl>

      <div>
        <Eyebrow>Recall, last {pulse.recallTrend.length} weeks</Eyebrow>
        <Sparkline trend={pulse.recallTrend} color={color} />
      </div>

      <p className="text-[13.5px] text-foreground">{pulseReason(pulse, now)}</p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <span className="text-muted-foreground">
          {pulse.nextDeadline ? (
            <>
              Next: <b className="font-medium text-foreground">{dueLabel(pulse.nextDeadline.dueAt, now)}</b>
            </>
          ) : (
            "Nothing due"
          )}
          {" · "}
          {pulse.lastStudiedAt ? `studied ${timeAgo(pulse.lastStudiedAt, now)}` : "not studied yet"}
        </span>
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link href={href}>Open module</Link>
        </Button>
      </div>
    </article>
  );
}

export function CoursePulseGrid({
  courses,
  pulses,
  now,
  onCreate,
  onRename,
  onDelete,
}: {
  courses: Course[];
  pulses: CoursePulseDto[];
  now: number;
  onCreate: () => void;
  onRename: (course: Course) => void;
  onDelete: (course: Course) => void;
}) {
  const [sort, setSort] = useState<SortMode>("attention");
  const pulseById = new Map(pulses.map((p) => [p.courseId, p]));
  const rows = courses
    .map((course) => ({ course, pulse: pulseById.get(course.id) }))
    .filter((r): r is { course: Course; pulse: CoursePulseDto } => r.pulse !== undefined)
    .sort((a, b) => {
      if (sort === "code") return courseLabel(a.course).localeCompare(courseLabel(b.course));
      const next = (p: CoursePulseDto) => p.nextDeadline?.dueAt ?? Infinity;
      if (sort === "deadline") return next(a.pulse) - next(b.pulse);
      return RANK[a.pulse.status] - RANK[b.pulse.status] || next(a.pulse) - next(b.pulse);
    });

  const needYou = pulses.filter((p) => p.status === "behind" || p.status === "attention").length;
  const heading =
    courses.length === 0
      ? "Add your modules to see how each one is going."
      : needYou === 0
        ? "Every module is on track."
        : `${needYou === 1 ? "One module needs" : `${needYou} modules need`} you this week.`;

  return (
    <section aria-labelledby="pulse-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Eyebrow>Your modules</Eyebrow>
          <h2 id="pulse-heading" className="font-reading text-xl font-medium leading-snug text-foreground">
            {heading}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort modules">
          {(
            [
              ["attention", "Needs attention"],
              ["deadline", "Next deadline"],
              ["code", "Module code"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={sort === mode}
              onClick={() => setSort(mode)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sort === mode
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-primary dark:bg-inset",
              )}
            >
              {label}
            </button>
          ))}
          <Button variant="outline" size="sm" className="ml-1 h-8" onClick={onCreate}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add module
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map(({ course, pulse }) => (
          <PulseCard
            key={course.id}
            course={course}
            pulse={pulse}
            now={now}
            onRename={() => onRename(course)}
            onDelete={() => onDelete(course)}
          />
        ))}
      </div>
    </section>
  );
}
