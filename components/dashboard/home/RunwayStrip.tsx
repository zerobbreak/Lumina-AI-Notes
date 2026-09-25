"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dayDiff, dueLabel } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import type { CoursePulseDto, HomeDeadlineDto } from "@/types/api/home";
import {
  Chip,
  CourseMark,
  HomeCard,
  Ring,
  courseColor,
  courseLabel,
  readinessTone,
  type CourseLookup,
} from "./parts";

const DAY = 86_400_000;
const DAYS = 14;

/** Days to start preparing before a deadline: more when you're less ready. */
export function prepDays(readiness: number | null) {
  if (readiness === null) return 3;
  return Math.min(6, Math.max(1, Math.round((1 - readiness) * 6) + 1));
}

type Lane = { key: string; course?: Course; deadlines: HomeDeadlineDto[]; overdue: HomeDeadlineDto[] };

function lanesFor(deadlines: HomeDeadlineDto[], overdue: HomeDeadlineDto[], courseOf: CourseLookup): Lane[] {
  const lanes = new Map<string, Lane>();
  const laneFor = (d: HomeDeadlineDto) => {
    const key = courseOf(d.courseId) ? d.courseId! : "other";
    if (!lanes.has(key)) lanes.set(key, { key, course: courseOf(d.courseId), deadlines: [], overdue: [] });
    return lanes.get(key)!;
  };
  for (const d of overdue) laneFor(d).overdue.push(d);
  for (const d of deadlines) laneFor(d).deadlines.push(d);
  // Lanes with something overdue or due soonest go on top; "Other" last.
  const first = (l: Lane) => (l.overdue.length ? -Infinity : (l.deadlines[0]?.dueAt ?? Infinity));
  return [...lanes.values()].sort((a, b) => (a.key === "other" ? 1 : b.key === "other" ? -1 : first(a) - first(b)));
}

/** The least prepared real deadline, named in the heading. */
function leastPreparedOf(deadlines: HomeDeadlineDto[]) {
  const work = deadlines.filter((d) => d.kind !== "event");
  const measured = work.filter((d) => d.readiness !== null);
  if (measured.length) return measured.reduce((a, b) => (b.readiness! < a.readiness! ? b : a));
  return work[0] ?? deadlines[0];
}

function Marker({
  deadline,
  course,
  selected,
  extra,
  now,
  onSelect,
}: {
  deadline: HomeDeadlineDto;
  course?: Course;
  selected: boolean;
  extra: number;
  now: number;
  onSelect: () => void;
}) {
  const isTest = deadline.kind === "exam";
  const label = `${course ? courseLabel(course) + " " : ""}${deadline.title}, due ${dueLabel(deadline.dueAt, now)}${extra ? `, plus ${extra} more that day` : ""}`;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={deadline.title}
      onClick={onSelect}
      className={cn(
        "absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-card text-[10px] font-bold text-card shadow-[0_0_0_1px_hsl(var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-inset",
        isTest ? "rotate-45 rounded-[5px]" : "rounded-full",
        selected && "shadow-[0_0_0_3px_hsl(var(--primary))]",
      )}
      style={{ background: courseColor(course) }}
    >
      <span className={cn(isTest && "-rotate-45")}>{extra ? `+${extra}` : isTest ? "T" : "A"}</span>
    </button>
  );
}

export function RunwayStrip({
  deadlines,
  overdue,
  pulses,
  courseOf,
  now,
}: {
  deadlines: HomeDeadlineDto[];
  overdue: HomeDeadlineDto[];
  pulses: CoursePulseDto[];
  courseOf: CourseLookup;
  now: number;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const lanes = lanesFor(deadlines, overdue, courseOf);
  const all = [...overdue, ...deadlines];
  // The prep panel opens on a click, so the strip stays slim above the plan.
  const selected = all.find((d) => d.id === selectedId);

  const days = Array.from({ length: DAYS }, (_, i) => new Date(now + i * DAY));
  const work = deadlines.filter((d) => d.kind !== "event");
  const leastPrepared = leastPreparedOf(deadlines);
  const leastCourse = leastPrepared?.readiness !== null ? courseOf(leastPrepared?.courseId) : undefined;

  if (all.length === 0) {
    return (
      <HomeCard className="px-5 py-4">
        <p className="text-[13px] text-muted-foreground">
          Nothing is due in the next two weeks. Deadlines you add, or sync from Brightspace, show up here.
        </p>
      </HomeCard>
    );
  }

  return (
    <section aria-labelledby="runway-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="runway-heading" className="font-reading text-xl font-medium leading-snug text-foreground">
          {work.length === 1 ? "One deadline" : `${work.length} deadlines`} in the next two weeks.
          {leastCourse && (
            <>
              {" "}
              <em className="italic text-primary">{courseLabel(leastCourse)}</em> is the least prepared.
            </>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden className="h-3 w-3 rounded-full bg-muted-foreground" />
            Assignment
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-muted-foreground" />
            Test or exam
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden className="h-2.5 w-5 rounded-[3px] bg-muted-foreground/30" />
            Time to prepare
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card dark:bg-inset">
        <div className="grid min-w-[760px] grid-cols-[8rem_repeat(14,minmax(0,1fr))]">
          <div className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground">Module</div>
          {days.map((d, i) => {
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={i}
                className={cn(
                  "border-b border-border py-2 text-center text-[11px] text-muted-foreground",
                  weekend && "bg-muted/50 dark:bg-foreground/[0.03]",
                  i === 0 && "bg-primary/10",
                )}
              >
                {i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" })}
                <b className={cn("block font-mono text-[13px] font-medium", i === 0 ? "text-primary" : "text-foreground")}>
                  {d.getDate()}
                </b>
              </div>
            );
          })}

          {lanes.map((lane) => (
            <Lane key={lane.key} lane={lane} days={days} now={now} selectedId={selected?.id} onSelect={setSelectedId} />
          ))}
        </div>
      </div>

      {selected ? (
        <PrepPanel
          deadline={selected}
          course={courseOf(selected.courseId)}
          pulse={pulses.find((p) => p.courseId === selected.courseId)}
          now={now}
          onClose={() => setSelectedId(undefined)}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Pick a deadline to see how ready you are and what to study for it.</p>
      )}
    </section>
  );
}

function Lane({
  lane,
  days,
  now,
  selectedId,
  onSelect,
}: {
  lane: Lane;
  days: Date[];
  now: number;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}) {
  const color = courseColor(lane.course);
  const byDay = new Map<number, HomeDeadlineDto[]>();
  for (const d of lane.deadlines) {
    const i = dayDiff(d.dueAt, now);
    if (i >= 0 && i < DAYS) byDay.set(i, [...(byDay.get(i) ?? []), d]);
  }
  // Prep bands: the days before each deadline, clipped to the strip.
  const prep = new Set<number>();
  const prepStart = new Set<number>();
  for (const [i, list] of byDay) {
    const span = Math.max(...list.map((d) => (d.kind === "event" ? 0 : prepDays(d.readiness))));
    const from = Math.max(0, i - span);
    for (let p = from; p < i; p++) prep.add(p);
    if (span > 0) prepStart.add(from);
  }

  return (
    <>
      <div className="flex h-[52px] items-center border-b border-border/70 px-3 last:border-b-0">
        {lane.course ? (
          <CourseMark course={lane.course} className="text-xs font-semibold text-foreground" />
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">No module</span>
        )}
      </div>
      {days.map((d, i) => {
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        const here = byDay.get(i);
        return (
          <div
            key={i}
            className={cn(
              "relative h-[52px] border-b border-l border-border/70",
              weekend && "bg-muted/50 dark:bg-foreground/[0.03]",
              i === 0 && "bg-primary/10",
            )}
          >
            {prep.has(i) && (
              <span
                aria-hidden
                className={cn("absolute right-0 top-[19px] h-3.5 opacity-30", prepStart.has(i) ? "left-[8%] rounded-l" : "left-0")}
                style={{ background: color }}
              />
            )}
            {i === 0 && lane.overdue.length > 0 && (
              <button
                type="button"
                aria-pressed={lane.overdue.some((o) => o.id === selectedId)}
                aria-label={`${lane.overdue.length} overdue${lane.course ? ` in ${courseLabel(lane.course)}` : ""}: ${lane.overdue.map((o) => o.title).join(", ")}`}
                title={lane.overdue.map((o) => o.title).join("\n")}
                onClick={() => {
                  const at = lane.overdue.findIndex((o) => o.id === selectedId);
                  // Step through this course's overdue items, then close.
                  onSelect(at === lane.overdue.length - 1 ? undefined : lane.overdue[at + 1]!.id);
                }}
                className={cn(
                  "absolute left-[26%] top-1/2 grid h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-inset",
                  lane.overdue.some((o) => o.id === selectedId) && "shadow-[0_0_0_3px_hsl(var(--primary))]",
                )}
              >
                {lane.overdue.length > 1 ? lane.overdue.length : "!"}
              </button>
            )}
            {here && (
              <Marker
                deadline={here[0]!}
                course={lane.course}
                selected={here.some((d) => d.id === selectedId)}
                extra={here.length - 1}
                now={now}
                onSelect={() => {
                  const at = here.findIndex((d) => d.id === selectedId);
                  // Clicking again steps through deadlines that share a day, then closes.
                  onSelect(at === here.length - 1 ? undefined : here[at + 1]!.id);
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function PrepPanel({
  deadline,
  course,
  pulse,
  now,
  onClose,
}: {
  deadline: HomeDeadlineDto;
  course?: Course;
  pulse?: CoursePulseDto;
  now: number;
  onClose: () => void;
}) {
  const overdue = deadline.dueAt < now;
  const days = dayDiff(deadline.dueAt, now);
  const tone = readinessTone(deadline.readiness);
  const toneLabel = { critical: "Behind", warning: "Needs a session", good: "On track", neutral: "Not measured yet" }[tone];
  const courseHref = course ? `/dashboard?contextId=${course.id}&contextType=course` : undefined;

  return (
    <HomeCard aria-live="polite" className="grid gap-0 md:grid-cols-[1fr_1.3fr]">
      <div className="flex flex-col gap-3 border-b border-border/70 p-5 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2">
          <CourseMark course={course} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h3 className="font-reading text-2xl font-medium leading-tight text-foreground">{deadline.title}</h3>
        <p className="text-[13px] text-muted-foreground">
          {new Date(deadline.dueAt).toLocaleString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          {overdue ? "overdue" : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
        </p>
        {deadline.readiness !== null ? (
          <div className="flex items-center gap-3.5">
            <Ring value={deadline.readiness} tone={tone} />
            <div className="space-y-1">
              <span className="block font-mono text-[22px] leading-none text-foreground">
                {Math.round(deadline.readiness * 100)}%
              </span>
              <Chip tone={tone}>{toneLabel}</Chip>
            </div>
          </div>
        ) : (
          <Chip className="self-start">{toneLabel}</Chip>
        )}
        <p className="text-xs text-muted-foreground">
          {deadline.readiness !== null
            ? "Readiness mixes the flashcards you know well with your latest quiz scores for this course."
            : "Add flashcards or take a quiz for this module to see how ready you are."}
        </p>
      </div>

      <div className="relative flex flex-col gap-1 p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 hidden rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:block"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Study material for this module
        </p>
        <MaterialRow
          count={pulse?.noteCount ?? 0}
          label="Notes"
          detail={course ? `Everything filed under ${courseLabel(course)}` : "No module linked"}
          href={courseHref}
        />
        <MaterialRow
          count={pulse?.cardCount ?? 0}
          label="Flashcards"
          detail={pulse?.dueToday ? `${pulse.dueToday} due today` : "None due today"}
          href="/dashboard?view=flashcards"
        />
        <MaterialRow
          count={pulse?.quizCount ?? 0}
          label="Quizzes"
          detail={pulse?.quizScore != null ? `Latest scores average ${Math.round(pulse.quizScore * 100)}%` : "Not taken yet"}
          href="/dashboard?view=quizzes"
        />
        {deadline.externalUrl && (
          <Button asChild size="sm" variant="outline" className="mt-2 h-8 self-start">
            <a href={deadline.externalUrl} target="_blank" rel="noopener noreferrer">
              Open in Brightspace
              <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        )}
      </div>
    </HomeCard>
  );
}

function MaterialRow({ count, label, detail, href }: { count: number; label: string; detail: string; href?: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/70 py-2 last:border-b-0">
      <span className="min-w-9 rounded-md bg-muted px-1.5 py-0.5 text-center font-mono text-xs text-foreground dark:bg-foreground/5">
        {count}
      </span>
      <span className="min-w-0 text-[13.5px] text-foreground">
        {label}
        <small className="block truncate text-xs text-muted-foreground">{detail}</small>
      </span>
      {href && (
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <Link href={href}>Open</Link>
        </Button>
      )}
    </div>
  );
}
