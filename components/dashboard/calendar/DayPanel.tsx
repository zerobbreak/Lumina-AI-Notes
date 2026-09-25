"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { BookOpen, FileText, GraduationCap, Mic } from "lucide-react";
import { DeadlineRow } from "@/components/dashboard/deadlines/DeadlineRow";
import { Button } from "@/components/ui/button";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";
import { isDone, isOverdue, isWork, studyLine, type DayBundle } from "@/lib/calendar/month";
import { planCourseId, planTitle } from "@/lib/calendar/planItems";
import { dueSoonChip, formatMinutes, overdueLabel, planAction } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import type { CoursePulseDto, PlanItemDto } from "@/types/api/home";
import { Eyebrow, courseColor, courseLabel, type CourseLookup } from "@/components/dashboard/home/parts";
import { QuickAdd } from "./QuickAdd";

const DAY = 86_400_000;

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

/** "due 23:59 · in 9 hr", "due 23:59 · 3 days overdue", "10:00". */
function whenText(d: DeadlineModel, now: number) {
  if (d.kind === "event") return clock(d.dueAt);
  const due = `due ${clock(d.dueAt)}`;
  if (isDone(d)) return `${due} · handed in`;
  if (isOverdue(d, now)) return `${due} · ${overdueLabel(d.dueAt, now)}`;
  const soon = dueSoonChip(d.dueAt, now);
  if (soon) return `${due} · ${soon.replace(/^Due /, "")}`;
  return `${due} · in ${Math.round((d.dueAt - now) / DAY)} days`;
}

/** "4 notes · 42 cards · 1 quiz · 58% ready", from the module's pulse. */
function prepLine(pulse: CoursePulseDto) {
  const parts: string[] = [];
  const count = (n: number, one: string, many = `${one}s`) => n > 0 && parts.push(`${n} ${n === 1 ? one : many}`);
  count(pulse.noteCount, "note");
  count(pulse.cardCount, "card");
  count(pulse.quizCount, "quiz", "quizzes");
  if (pulse.readiness !== null) parts.push(`${Math.round(pulse.readiness * 100)}% ready`);
  return parts.length ? parts.join(" · ") : "Nothing to study from yet";
}

function DueCard({
  deadline,
  course,
  pulse,
  now,
}: {
  deadline: DeadlineModel;
  course?: Course;
  pulse?: CoursePulseDto;
  now: number;
}) {
  const open = isWork(deadline) && !isDone(deadline);
  return (
    <li className="space-y-2.5 rounded-xl border border-border bg-card p-3 dark:bg-inset">
      <DeadlineRow
        deadline={deadline}
        when={whenText(deadline, now)}
        overdue={isOverdue(deadline, now)}
        detail={course ? `${course.code} · ${course.name}` : null}
      />
      {open && course && pulse && (
        <div className="flex items-center gap-2 border-t border-dashed border-border pt-2.5 pl-7">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{prepLine(pulse)}</span>
          <Button asChild size="sm" variant="secondary" className="h-7 px-2.5 text-xs">
            <Link href={`/dashboard?contextId=${course.id}&contextType=course`}>
              {deadline.kind === "exam" ? "Study" : "Open module"}
            </Link>
          </Button>
        </div>
      )}
    </li>
  );
}

function PlanRow({ item, courseOf }: { item: PlanItemDto; courseOf: CourseLookup }) {
  const course = courseOf(planCourseId(item));
  const action = planAction(item);
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-dashed border-border px-3 py-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: courseColor(course) }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{planTitle(item)}</span>
        {course && <span className="block truncate text-[11px] text-muted-foreground">{courseLabel(course)}</span>}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatMinutes(item.minutes)}</span>
      {action && (
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          {action.external ? (
            <a href={action.href} target="_blank" rel="noopener noreferrer">
              {action.label}
            </a>
          ) : (
            <Link href={action.href}>{action.label}</Link>
          )}
        </Button>
      )}
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

/** Everything on the selected day: what's due, today's plan, what you did, and a way to add more. */
export const DayPanel = forwardRef<
  HTMLInputElement,
  {
    date: Date;
    isToday: boolean;
    bundle?: DayBundle;
    showActivity: boolean;
    plan: PlanItemDto[];
    pulses: CoursePulseDto[];
    courses: Course[];
    courseOf: CourseLookup;
    now: number;
  }
>(function DayPanel({ date, isToday, bundle, showActivity, plan, pulses, courses, courseOf, now }, quickAddRef) {
  const deadlines = bundle?.deadlines ?? [];
  const recordings = showActivity ? (bundle?.recordings ?? []) : [];
  const notes = showActivity ? (bundle?.notes ?? []) : [];
  const study = bundle && showActivity ? studyLine(bundle.study) : null;
  const todaysPlan = isToday ? plan : [];
  const pulseOf = (courseId?: string) => pulses.find((p) => p.courseId === courseId);

  const work = deadlines.filter(isWork);
  const summary = [
    work.length ? `${work.length} due` : "Nothing due",
    recordings.length ? `${recordings.length} recording${recordings.length === 1 ? "" : "s"}` : null,
    notes.length ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : null,
    study,
  ]
    .filter(Boolean)
    .join(" · ");
  const empty = deadlines.length === 0 && recordings.length === 0 && notes.length === 0 && !study && todaysPlan.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-1 border-b border-border px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <Eyebrow>{date.toLocaleDateString(undefined, { weekday: "long" })}</Eyebrow>
          {isToday && (
            <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              Today
            </span>
          )}
        </div>
        <h2 className="font-reading text-[26px] font-medium leading-tight tracking-[-0.01em] text-foreground">
          {date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
        </h2>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-6">
        {deadlines.length > 0 && (
          <Section title="Due">
            <ul className="space-y-2">
              {deadlines.map((d) => (
                <DueCard key={d._id} deadline={d} course={courseOf(d.courseId)} pulse={pulseOf(d.courseId)} now={now} />
              ))}
            </ul>
          </Section>
        )}

        {todaysPlan.length > 0 && (
          <Section title="From your plan">
            <ul className="space-y-1.5">
              {todaysPlan.map((item) => (
                <PlanRow key={`${item.kind}-${item.id}`} item={item} courseOf={courseOf} />
              ))}
            </ul>
          </Section>
        )}

        {(recordings.length > 0 || notes.length > 0 || study) && (
          <Section title="What you did">
            <ul className="space-y-0.5">
              {study && (
                <li className="flex items-center gap-2.5 px-1 py-1.5 text-sm text-foreground">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {study}
                </li>
              )}
              {recordings.map((r) => (
                <li key={r._id} className="flex items-center gap-2.5 px-1 py-1.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <Mic className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {clock(r.createdAt)}
                      {r.duration ? ` · ${formatMinutes(Math.max(1, Math.round(r.duration / 60)))} recorded` : ""}
                    </span>
                  </span>
                </li>
              ))}
              {notes.map((n) => {
                const course = courseOf(n.courseId);
                return (
                  <li key={n._id}>
                    <Link
                      href={`/dashboard?noteId=${n._id}`}
                      className="flex items-center gap-2.5 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{n.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {[course && courseLabel(course), `created ${clock(n.createdAt)}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {n.quickCaptureStatus === "draft" && (
                        <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          In progress
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {empty && (
          <p
            className={cn(
              "rounded-xl border border-dashed border-border px-4 py-5 text-sm leading-relaxed text-muted-foreground",
            )}
          >
            Nothing due and no activity on this day.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3 md:px-6">
        <QuickAdd ref={quickAddRef} date={date} courses={courses} />
      </div>
    </div>
  );
});
