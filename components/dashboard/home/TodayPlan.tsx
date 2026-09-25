"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetDeadlineCompleted } from "@/lib/mutations/deadlines/useSetDeadlineCompleted";
import type { ChecklistRow } from "@/lib/home/planChecklist";
import { dueLabel, dueSoonChip, formatMinutes, overdueLabel, planAction, timeAgo, type PlanAction } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { CoursePulseDto, PlanItemDto } from "@/types/api/home";
import { ActionButton, Chip, CourseMark, HomeCard, courseLabel, type CourseLookup, type Tone } from "./parts";

const DAY = 86_400_000;

/** What an item says, by kind. */
function describe(item: PlanItemDto, courseOf: CourseLookup, pulses: CoursePulseDto[], now: number) {
  switch (item.kind) {
    case "overdue":
    case "deadline": {
      const d = item.deadline;
      const readiness = d.readiness === null ? null : Math.round(d.readiness * 100);
      const detail =
        item.kind === "overdue"
          ? `It was due ${dueLabel(d.dueAt, now)}. Tick it off if you've already handed it in.`
          : `Due ${dueLabel(d.dueAt, now)}.` +
            (readiness === null ? "" : ` Your cards and quizzes put you about ${readiness}% ready.`);
      const chip: { tone: Tone; text: string | null } =
        item.kind === "overdue"
          ? { tone: "critical", text: overdueLabel(d.dueAt, now) }
          : { tone: d.dueAt - now < 2 * DAY ? "critical" : "warning", text: dueSoonChip(d.dueAt, now) };
      return { title: d.title, detail, chip, course: courseOf(d.courseId) };
    }
    case "review": {
      const urgent = courseOf(item.urgentCourseId);
      const urgentCount = item.byCourse.find((c) => c.courseId === item.urgentCourseId)?.count ?? 0;
      const next = pulses.find((p) => p.courseId === item.urgentCourseId)?.nextDeadline;
      const top = item.byCourse[0];
      const topCourse = courseOf(top?.courseId);
      let detail = "Spaced repetition has these due today.";
      if (urgent && next) {
        const which = urgentCount === item.dueCount ? "All" : String(urgentCount);
        detail = `${which} of them ${urgentCount === 1 ? "is" : "are"} ${courseLabel(urgent)}, ahead of ${next.title} ${dueLabel(next.dueAt, now)}.`;
      } else if (topCourse && top && item.byCourse.length > 1) {
        detail = `Mostly ${courseLabel(topCourse)}: ${top.count} of ${item.dueCount}.`;
      }
      return {
        title: `Review ${item.dueCount} flashcard${item.dueCount === 1 ? "" : "s"}`,
        detail,
        chip: { tone: "warning" as Tone, text: `${item.dueCount} due` },
        course: urgent ?? (item.byCourse.length === 1 ? topCourse : undefined),
      };
    }
    case "weak-quiz":
      return {
        title: `Retake ${item.title}`,
        detail: `You scored ${item.scorePercent}% ${timeAgo(item.takenAt, now)}. A retake shows whether it has stuck.`,
        chip: { tone: "warning" as Tone, text: "Weak topic" },
        course: courseOf(item.courseId),
      };
  }
}

function DoneBox({
  item,
  done,
  onChange,
}: {
  item: PlanItemDto;
  done: boolean;
  onChange: (done: boolean) => void;
}) {
  const setCompleted = useSetDeadlineCompleted();
  const title = item.kind === "overdue" || item.kind === "deadline" ? item.deadline.title : describeTitle(item);
  return (
    <Checkbox
      checked={done}
      disabled={setCompleted.isPending}
      aria-label={done ? `Mark ${title} not done` : `Mark ${title} done`}
      onCheckedChange={(checked) => {
        const next = checked === true;
        onChange(next);
        // A deadline is really finished (or reopened), not just ticked here.
        if (item.kind === "overdue" || item.kind === "deadline") {
          setCompleted.mutate(
            { id: item.deadline.id, completed: next },
            {
              onError: () => {
                onChange(!next);
                toast.error(`Couldn't update ${item.deadline.title}. Try again.`);
              },
            },
          );
        }
      }}
    />
  );
}

const describeTitle = (item: PlanItemDto) =>
  item.kind === "review" ? "the flashcard review" : item.kind === "weak-quiz" ? `the ${item.title} retake` : "";

export function TodayPlan({
  rows,
  onToggle,
  hiddenOverdue,
  pulses,
  courseOf,
  now,
  actionFor = planAction,
  className,
}: {
  rows: ChecklistRow[];
  onToggle: (item: PlanItemDto, index: number, done: boolean) => void;
  /** Overdue items left out of the plan; they're listed in "Coming up". */
  hiddenOverdue: number;
  pulses: CoursePulseDto[];
  courseOf: CourseLookup;
  now: number;
  /** Where each item's button goes; a module page drops links back to itself. */
  actionFor?: (item: PlanItemDto) => PlanAction | null;
  className?: string;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const whyId = useId();
  const doneCount = rows.filter((r) => r.done).length;
  const minutesLeft = rows.filter((r) => !r.done).reduce((n, r) => n + r.item.minutes, 0);

  return (
    <HomeCard aria-labelledby="today-plan-heading" className={cn("flex flex-col", className)}>
      <h2 id="today-plan-heading" className="sr-only">
        Today&apos;s plan
      </h2>
      {rows.length === 0 ? (
        <div className="p-6">
          <p className="text-sm font-medium text-foreground">You&apos;re clear for today.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No cards are due, nothing is due this week, and your recent quizzes went well.
          </p>
        </div>
      ) : (
        <ol>
          {rows.map(({ item, done }, index) => {
            const { title, detail, chip, course } = describe(item, courseOf, pulses, now);
            const isDeadline = item.kind === "overdue" || item.kind === "deadline";
            return (
              <li
                key={item.id}
                className="grid grid-cols-[1.75rem_1fr] items-start gap-x-3.5 gap-y-3 border-b border-border/70 px-5 py-4 last:border-b-0 sm:grid-cols-[1.75rem_1fr_auto]"
              >
                <span
                  aria-hidden
                  className={cn(
                    "pt-0.5 font-reading text-[22px] leading-none tabular-nums",
                    done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "text-[15px] font-semibold leading-snug",
                      done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {title}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{detail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {chip.text && !done && <Chip tone={chip.tone}>{chip.text}</Chip>}
                    {done && <Chip tone="good">Done</Chip>}
                    <CourseMark course={course} />
                    <Chip>About {formatMinutes(item.minutes)}</Chip>
                    {isDeadline && item.deadline.source === "brightspace" && <Chip>From Brightspace</Chip>}
                  </div>
                </div>
                <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:flex-col sm:items-end sm:gap-2">
                  <DoneBox item={item} done={done} onChange={(next) => onToggle(item, index, next)} />
                  {!done && <ActionButton action={actionFor(item)} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rows.length > 0 && (
        <div className="mt-auto rounded-b-xl border-t border-border/70 bg-muted/40 dark:bg-foreground/[0.02]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <span className="text-[13px] text-foreground tabular-nums">
              {doneCount} of {rows.length} done
              {" · "}
              {minutesLeft > 0 ? `${formatMinutes(minutesLeft)} left` : "all done for today"}
            </span>
            <div
              className="h-1.5 min-w-20 max-w-56 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Plan progress"
              aria-valuemin={0}
              aria-valuemax={rows.length}
              aria-valuenow={doneCount}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${(doneCount / rows.length) * 100}%` }}
              />
            </div>
            <button
              type="button"
              aria-expanded={showWhy}
              aria-controls={whyId}
              onClick={() => setShowWhy((v) => !v)}
              className="ml-auto rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-inset"
            >
              Why this order?
            </button>
          </div>
          <div id={whyId} hidden={!showWhy} className="border-t border-border/70 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
            Overdue work comes first, then deadlines due this week (sooner and less prepared rank higher), then
            the cards due today, then quizzes from the last month you scored under 60%. A module with a deadline
            this week pushes its cards and quizzes up.
            {hiddenOverdue > 0 &&
              ` Only the most recent overdue item is here; the other ${hiddenOverdue} are in Coming up.`}
          </div>
        </div>
      )}
    </HomeCard>
  );
}
