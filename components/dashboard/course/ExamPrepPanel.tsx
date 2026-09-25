"use client";

import Link from "next/link";
import { Eyebrow, HomeCard } from "@/components/dashboard/home/parts";
import { dueLabel } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { ExamPrepDto, PrepDayDto } from "@/types/api/courseOverview";
import { studySetHref } from "./StudySetsTable";

function countdown(daysLeft: number) {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

const dayLabel = (dayStart: number, index: number) =>
  index === 0
    ? "Today"
    : new Date(dayStart).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });

function DayItem({ item }: { item: PrepDayDto["items"][number] }) {
  if (item.kind === "review") {
    return (
      <Link
        href="/dashboard?view=flashcards"
        className="block rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground dark:bg-foreground/5"
      >
        Review due cards
      </Link>
    );
  }
  return (
    <Link
      href={studySetHref(item)}
      className="block rounded-md bg-warning/10 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-warning/20"
    >
      <span className="line-clamp-2">
        {item.kind === "deck" ? "Drill" : "Retake"} {item.title}
      </span>
    </Link>
  );
}

/**
 * Shown on the module page from two weeks before an exam: the countdown, how
 * much of the module's practice is solid, and a set to work on each day.
 */
export function ExamPrepPanel({ prep, now, onHide }: { prep: ExamPrepDto; now: number; onHide: () => void }) {
  const { solid, shaky, untouched } = prep.coverage;
  const total = solid + shaky + untouched;

  return (
    <HomeCard aria-labelledby="exam-prep-heading" className="space-y-6 border-primary/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Eyebrow className="text-primary">Exam prep</Eyebrow>
          <h2 id="exam-prep-heading" className="font-reading text-3xl font-medium leading-tight text-foreground">
            {prep.exam.title} <span className="text-primary">{countdown(prep.daysLeft)}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {dueLabel(prep.exam.dueAt, now)}
            {prep.exam.source === "brightspace" && " · from Brightspace"}
          </p>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-inset"
        >
          Hide exam prep
        </button>
      </div>

      {total > 0 && (
        <div className="max-w-xl space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow>Practice coverage</Eyebrow>
            <span className="text-xs text-muted-foreground">
              {total} flashcard deck{total === 1 ? "" : "s"} and quizzes
            </span>
          </div>
          <div
            className="flex h-3 gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={`${solid} solid, ${shaky} shaky, ${untouched} not started`}
          >
            {solid > 0 && <div className="bg-primary" style={{ flexGrow: solid }} />}
            {shaky > 0 && <div className="bg-warning" style={{ flexGrow: shaky }} />}
            {untouched > 0 && <div className="bg-muted" style={{ flexGrow: untouched }} />}
          </div>
          <div aria-hidden className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />{solid} solid</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning" />{shaky} shaky</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted ring-1 ring-border" />{untouched} not started</span>
          </div>
        </div>
      )}

      {prep.days.length > 0 && (
        <div className="space-y-2">
          <Eyebrow>
            {prep.focus.length > 0
              ? "A set a day, weakest first, then a light last day"
              : "Keep your cards ticking over until the exam"}
          </Eyebrow>
          <ol className="flex gap-2 overflow-x-auto pb-1">
            {prep.days.map((day, index) => (
              <li
                key={day.dayStart}
                className={cn(
                  "flex w-32 shrink-0 flex-col gap-1.5 rounded-lg border bg-card p-2.5 dark:bg-inset",
                  index === 0 ? "border-2 border-primary" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[11px] font-medium uppercase",
                    index === 0 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {dayLabel(day.dayStart, index)}
                </span>
                {day.items.map((item) => (
                  <DayItem key={"id" in item ? item.id : item.kind} item={item} />
                ))}
              </li>
            ))}
          </ol>
        </div>
      )}

      {prep.daysLeft <= 0 && <p className="text-sm text-foreground">Good luck. A short review of your cards is plenty now.</p>}
    </HomeCard>
  );
}
