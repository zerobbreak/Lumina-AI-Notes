"use client";

import { cn } from "@/lib/utils";
import { Eyebrow, HomeCard } from "./parts";

const DAY = 86_400_000;

/** The last 14 days as a row of squares, today outlined. */
export function StudyStreakCard({ days, streak, now }: { days: boolean[]; streak: number; now: number }) {
  const studied = days.filter(Boolean).length;
  return (
    <HomeCard aria-labelledby="streak-heading" className="flex flex-col gap-2.5 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow id="streak-heading">Last {days.length} days</Eyebrow>
        <span className="text-[13px] text-foreground">
          <b className="font-mono font-medium">{streak}</b> day streak
        </span>
      </div>
      <ol className="grid grid-cols-14 gap-1" aria-label={`Studied on ${studied} of the last ${days.length} days`}>
        {days.map((on, i) => {
          const date = new Date(now - (days.length - 1 - i) * DAY);
          const label = `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${on ? "studied" : "no study"}`;
          return (
            <li
              key={i}
              title={label}
              aria-label={label}
              className={cn(
                "aspect-square rounded-[3px]",
                on ? "bg-emerald-600 dark:bg-emerald-500" : "bg-muted dark:bg-foreground/10",
                i === days.length - 1 && "outline outline-[1.5px] outline-offset-1 outline-primary",
              )}
            />
          );
        })}
      </ol>
    </HomeCard>
  );
}
