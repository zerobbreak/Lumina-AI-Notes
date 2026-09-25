"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ComingUpCard } from "@/components/dashboard/home/ComingUpCard";
import { TodayPlan } from "@/components/dashboard/home/TodayPlan";
import { Button } from "@/components/ui/button";
import { usePlanChecklist } from "@/lib/home/planChecklist";
import { planAction, timeAgo } from "@/lib/home/planCopy";
import { useCourseOverview } from "@/lib/queries/home/useCourseOverview";
import type { Course } from "@/types";
import type { PlanItemDto } from "@/types/api/home";
import { ExamPrepPanel } from "./ExamPrepPanel";
import { HealthStrip } from "./HealthStrip";
import { StudySetsTable } from "./StudySetsTable";

const HIDDEN_EXAM_PREFIX = "lumina:exam-prep-hidden:";

/** Whether this plan item is about the given course; ticks from home are shared, so the rest are filtered out. */
function belongsTo(courseId: string) {
  return (item: PlanItemDto) => {
    if (item.kind === "review") return item.byCourse.some((c) => c.courseId === courseId);
    if (item.kind === "weak-quiz") return item.courseId === courseId;
    return item.deadline.courseId === courseId;
  };
}

/** The exam the student hid the prep panel for, per exam, in this browser. */
function useHiddenExam(examId: string | undefined) {
  const key = examId ? HIDDEN_EXAM_PREFIX + examId : null;
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  let stored = false;
  if (key && !(key in hidden)) {
    try {
      stored = window.localStorage.getItem(key) === "1";
    } catch {
      // Blocked storage: the panel just shows again next visit.
    }
  }
  const isHidden = key ? (hidden[key] ?? stored) : false;
  const setHiddenFor = useCallback(
    (value: boolean) => {
      if (!key) return;
      setHidden((h) => ({ ...h, [key]: value }));
      try {
        if (value) window.localStorage.setItem(key, "1");
        else window.localStorage.removeItem(key);
      } catch {
        // As above.
      }
    },
    [key],
  );
  return [isHidden, setHiddenFor] as const;
}

const noCourse = () => undefined;

/** The plan's buttons, minus "Open module" for the module already open. */
function actionOnPage(courseId: string) {
  return (item: PlanItemDto) => {
    const action = planAction(item);
    return action?.href.includes(`contextId=${courseId}`) ? null : action;
  };
}

/**
 * The top of a module's page: exam prep when an exam is close, how the module
 * is going, what to do next in it, and its flashcards and quizzes.
 */
export function CourseOverview({ course }: { course: Course }) {
  const { data, isPending, isError, refetch } = useCourseOverview(course.id);
  const now = data?.generatedAt ?? 0;
  // Before data arrives the plan is empty, so the placeholder day never stores a tick.
  const checklist = usePlanChecklist(data?.plan ?? [], now, belongsTo(course.id));
  const [examHidden, setExamHidden] = useHiddenExam(data?.examPrep?.exam.id);

  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading how this module is going" className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5 text-sm dark:bg-inset">
        <span className="text-foreground">Couldn&apos;t load how this module is going.</span>
        <Button size="sm" variant="outline" className="h-8" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const prep = data.examPrep;
  const hiddenOverdue = data.overdue.filter((d) => d.kind !== "event").length -
    data.plan.filter((p) => p.kind === "overdue").length;

  return (
    <div className="space-y-8">
      {prep && !examHidden && <ExamPrepPanel prep={prep} now={now} onHide={() => setExamHidden(true)} />}
      {prep && examHidden && (
        <p className="text-sm text-muted-foreground">
          Exam prep for {prep.exam.title} is hidden.{" "}
          <button
            type="button"
            onClick={() => setExamHidden(false)}
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Show it
          </button>
        </p>
      )}

      <HealthStrip course={course} pulse={data.pulse} now={now} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="font-reading text-xl font-medium text-foreground">Next up in this module</h2>
          <TodayPlan
            rows={checklist.rows}
            onToggle={checklist.setDone}
            hiddenOverdue={Math.max(0, hiddenOverdue)}
            pulses={[data.pulse]}
            courseOf={noCourse}
            now={now}
            actionFor={actionOnPage(course.id)}
          />
          {data.lastOpened && (
            <p className="text-[13px] text-muted-foreground">
              Last opened:{" "}
              <Link
                href={`/dashboard?noteId=${data.lastOpened.noteId}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {data.lastOpened.title}
              </Link>
              , {timeAgo(data.lastOpened.lastAccessedAt, now)}
            </p>
          )}
        </div>
        {/* Lines up with the plan below its heading; the card carries its own "Coming up" label. */}
        <div className="lg:pt-10">
          <ComingUpCard overdue={data.overdue} upcoming={data.upcoming} courseOf={noCourse} now={now} />
        </div>
      </div>

      <StudySetsTable sets={data.studySets} now={now} />
    </div>
  );
}
