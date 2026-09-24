"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CourseTile } from "@/components/dashboard/sidebar/CourseTile";
import { useSetDeadlineCompleted } from "@/lib/mutations/deadlines/useSetDeadlineCompleted";
import { isPlaceholderCourseCode } from "@/lib/courseDisplay";
import { dueLabel, dueSoonChip, formatMinutes, overdueLabel, timeAgo } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import type { CoursePulseDto, HomeDeadlineDto, PlanItemDto } from "@/types/api/home";

type CourseLookup = (courseId: string | null | undefined) => Course | undefined;

const courseLabel = (course: Course) => (isPlaceholderCourseCode(course.code) ? course.name : course.code);

function Chip({ tone = "neutral", children }: { tone?: "critical" | "warning" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "critical" && "bg-destructive/10 text-destructive",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "neutral" && "bg-muted text-muted-foreground dark:bg-foreground/5",
      )}
    >
      {children}
    </span>
  );
}

function CourseMark({ course }: { course?: Course }) {
  if (!course) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <CourseTile name={course.name} code={course.code} color={course.color} />
      {courseLabel(course)}
    </span>
  );
}

/** What an item says and offers, by kind. */
function describe(item: PlanItemDto, courseOf: CourseLookup, pulses: CoursePulseDto[], now: number) {
  switch (item.kind) {
    case "overdue":
    case "deadline": {
      const d = item.deadline;
      const readiness = d.readiness === null ? null : Math.round(d.readiness * 100);
      const detail =
        item.kind === "overdue"
          ? `It was due ${dueLabel(d.dueAt, now)}.`
          : `Due ${dueLabel(d.dueAt, now)}.` +
            (readiness === null ? "" : ` Your cards and quizzes for this course put you about ${readiness}% ready.`);
      const chip =
        item.kind === "overdue"
          ? { tone: "critical" as const, text: overdueLabel(d.dueAt, now) }
          : { tone: d.dueAt - now < 2 * 86_400_000 ? ("critical" as const) : ("warning" as const), text: dueSoonChip(d.dueAt, now) ?? "" };
      return { title: d.title, detail, chip, course: courseOf(d.courseId) };
    }
    case "review": {
      const urgent = item.urgentCourseId ? courseOf(item.urgentCourseId) : undefined;
      const urgentCount = item.byCourse.find((c) => c.courseId === item.urgentCourseId)?.count ?? 0;
      const next = pulses.find((p) => p.courseId === item.urgentCourseId)?.nextDeadline;
      const top = item.byCourse[0];
      const topCourse = top ? courseOf(top.courseId) : undefined;
      let detail = "Spaced repetition has these due today.";
      if (urgent && next) {
        detail = `${urgentCount === item.dueCount ? "All" : urgentCount} of them ${urgentCount === 1 ? "is" : "are"} ${courseLabel(urgent)}, ahead of ${next.title} ${dueLabel(next.dueAt, now)}.`;
      } else if (topCourse && item.byCourse.length > 1) {
        detail = `Mostly ${courseLabel(topCourse)}: ${top!.count} of ${item.dueCount}.`;
      }
      return {
        title: `Review ${item.dueCount} flashcard${item.dueCount === 1 ? "" : "s"}`,
        detail,
        chip: { tone: "warning" as const, text: `${item.dueCount} due` },
        course: urgent ?? (item.byCourse.length === 1 ? topCourse : undefined),
      };
    }
    case "weak-quiz":
      return {
        title: `Retake ${item.title}`,
        detail: `You scored ${item.scorePercent}% ${timeAgo(item.takenAt, now)}. A retake shows whether it has stuck.`,
        chip: { tone: "warning" as const, text: `Last score ${item.scorePercent}%` },
        course: courseOf(item.courseId),
      };
  }
}

function DeadlineDone({ deadline }: { deadline: HomeDeadlineDto }) {
  const setCompleted = useSetDeadlineCompleted();
  return (
    <Checkbox
      checked={setCompleted.isPending}
      disabled={setCompleted.isPending}
      aria-label={`Mark ${deadline.title} done`}
      onCheckedChange={() =>
        setCompleted.mutate(
          { id: deadline.id, completed: true },
          { onError: () => toast.error("Couldn't mark it done. Try again.") },
        )
      }
    />
  );
}

function ItemAction({ item }: { item: PlanItemDto }) {
  if (item.kind === "review") {
    return (
      <Button asChild size="sm" className="h-8">
        <Link href="/dashboard?view=flashcards">Start review</Link>
      </Button>
    );
  }
  if (item.kind === "weak-quiz") {
    return (
      <Button asChild size="sm" variant="outline" className="h-8">
        <Link href={`/dashboard?view=quizzes&deckId=${item.quizDeckId}`}>Retake</Link>
      </Button>
    );
  }
  const d = item.deadline;
  if (d.externalUrl) {
    return (
      <Button asChild size="sm" variant="outline" className="h-8">
        <a href={d.externalUrl} target="_blank" rel="noopener noreferrer">
          Brightspace
          <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Button>
    );
  }
  if (d.courseId) {
    return (
      <Button asChild size="sm" variant="outline" className="h-8">
        <Link href={`/dashboard?contextId=${d.courseId}&contextType=course`}>Open course</Link>
      </Button>
    );
  }
  return null;
}

export function TodayPlan({
  plan,
  planMinutes,
  pulses,
  courseOf,
  now,
  className,
}: {
  plan: PlanItemDto[];
  planMinutes: number;
  pulses: CoursePulseDto[];
  courseOf: CourseLookup;
  now: number;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="today-plan-heading"
      className={cn("rounded-2xl border border-border bg-card shadow-sm dark:bg-inset dark:shadow-none", className)}
    >
      <h2 id="today-plan-heading" className="sr-only">
        Today&apos;s plan
      </h2>
      {plan.length === 0 ? (
        <div className="p-6">
          <p className="text-sm font-medium text-foreground">You&apos;re clear for today.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No cards are due, nothing is due this week, and your recent quizzes went well.
          </p>
        </div>
      ) : (
        <ol>
          {plan.map((item, index) => {
            const { title, detail, chip, course } = describe(item, courseOf, pulses, now);
            const isDeadline = item.kind === "overdue" || item.kind === "deadline";
            return (
              <li
                key={item.id}
                className="grid grid-cols-[1.75rem_1fr] gap-x-3 gap-y-3 border-b border-border/70 px-5 py-4 last:border-b-0 sm:grid-cols-[1.75rem_1fr_auto]"
              >
                <span aria-hidden className="pt-0.5 font-reading text-xl leading-none text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-snug text-foreground">{title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {chip.text && <Chip tone={chip.tone}>{chip.text}</Chip>}
                    <CourseMark course={course} />
                    <Chip>About {formatMinutes(item.minutes)}</Chip>
                    {isDeadline && item.deadline.source === "brightspace" && <Chip>From Brightspace</Chip>}
                  </div>
                </div>
                <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:flex-col sm:items-end">
                  {isDeadline && <DeadlineDone deadline={item.deadline} />}
                  <ItemAction item={item} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {plan.length > 0 && (
        <p className="rounded-b-2xl border-t border-border/70 bg-muted/40 px-5 py-3 text-xs text-muted-foreground dark:bg-foreground/[0.02]">
          {plan.length} item{plan.length === 1 ? "" : "s"}, about {formatMinutes(planMinutes)}. Ranked by
          what&apos;s overdue, what&apos;s due soonest, how ready you are, and what you&apos;re starting to forget.
        </p>
      )}
    </section>
  );
}
