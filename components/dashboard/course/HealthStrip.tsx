"use client";

import { Sparkline } from "@/components/dashboard/home/CoursePulseGrid";
import { Eyebrow, HomeCard, Ring, courseColor, readinessTone } from "@/components/dashboard/home/parts";
import { dueLabel, formatMinutes } from "@/lib/home/planCopy";
import type { Course } from "@/types";
import type { CoursePulseDto } from "@/types/api/home";

const percent = (v: number) => `${Math.round(v * 100)}%`;

/** Readiness, recall, today's cards and the next deadline, side by side. */
export function HealthStrip({ course, pulse, now }: { course: Course; pulse: CoursePulseDto; now: number }) {
  const recalls = pulse.recallTrend.filter((v): v is number => v !== null);
  const recallChange = recalls.length >= 2 ? Math.round((recalls[recalls.length - 1]! - recalls[0]!) * 100) : null;
  const next = pulse.nextDeadline;

  return (
    <section aria-label="How this module is going" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HomeCard className="flex items-center gap-4 p-5">
        {pulse.readiness === null ? (
          <div>
            <Eyebrow>Readiness</Eyebrow>
            <p className="mt-1 text-sm text-muted-foreground">Make flashcards or take a quiz to measure this.</p>
          </div>
        ) : (
          <>
            <Ring value={pulse.readiness} tone={readinessTone(pulse.readiness)} />
            <div>
              <Eyebrow>Readiness</Eyebrow>
              <p className="font-mono text-2xl font-medium text-foreground">{percent(pulse.readiness)}</p>
              <p className="text-xs text-muted-foreground">From your cards and quiz scores</p>
            </div>
          </>
        )}
      </HomeCard>

      <HomeCard className="flex flex-col gap-1 p-5">
        <Eyebrow>Recall, last {pulse.recallTrend.length} weeks</Eyebrow>
        {pulse.recall === null && recalls.length < 2 ? (
          <p className="mt-1 text-sm text-muted-foreground">Review a few cards to see how much is sticking.</p>
        ) : (
          <>
            <p className="font-mono text-2xl font-medium text-foreground">{pulse.recall === null ? "–" : percent(pulse.recall)}</p>
            <Sparkline trend={pulse.recallTrend} color={courseColor(course)} />
            {recallChange !== null && recallChange !== 0 && (
              <p className="text-xs text-muted-foreground">
                {recallChange > 0 ? "Up" : "Down"} {Math.abs(recallChange)} points over the period
              </p>
            )}
          </>
        )}
      </HomeCard>

      <HomeCard className="flex flex-col gap-1 p-5">
        <Eyebrow>Due today</Eyebrow>
        <p className="font-mono text-2xl font-medium text-foreground">
          {pulse.dueToday} card{pulse.dueToday === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-muted-foreground">
          {pulse.dueToday === 0
            ? `${pulse.cardCount} card${pulse.cardCount === 1 ? "" : "s"} in this module, none due`
            : `About ${formatMinutes(Math.max(1, Math.ceil(pulse.dueToday * 0.4)))}`}
        </p>
      </HomeCard>

      <section
        aria-label="Next deadline"
        className="flex flex-col gap-1 rounded-xl bg-foreground p-5 text-background shadow-sm dark:bg-inset dark:text-foreground dark:ring-1 dark:ring-border"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] opacity-75">Next deadline</p>
        {next ? (
          <>
            <p className="line-clamp-2 text-lg font-semibold leading-snug">{next.title}</p>
            <p className="text-[13px] opacity-85">Due {dueLabel(next.dueAt, now)}</p>
          </>
        ) : (
          <p className="text-sm opacity-85">Nothing due in the next two weeks.</p>
        )}
        {pulse.overdueCount > 0 && (
          <p className="mt-auto pt-1 text-xs font-semibold opacity-90">
            Plus {pulse.overdueCount} overdue
          </p>
        )}
      </section>
    </section>
  );
}
