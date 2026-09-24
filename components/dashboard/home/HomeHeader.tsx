"use client";

import type { Headline, PlanAction } from "@/lib/home/planCopy";
import { ActionButton, Eyebrow } from "./parts";

function partOfDay(hour: number) {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Date line, then a sentence about today's work in place of a greeting. */
export function HomeHeader({
  now,
  firstName,
  headline,
  action,
}: {
  now: number;
  firstName?: string;
  headline?: Headline;
  action: PlanAction | null;
}) {
  const date = new Date(now);
  return (
    <header className="flex flex-wrap items-end justify-between gap-5" data-tour="dashboard-overview">
      <div className="min-w-0 space-y-1.5">
        <Eyebrow>
          {date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          {" · "}
          {partOfDay(date.getHours())}
          {firstName && <span className="normal-case tracking-normal">{` · hi, ${firstName}`}</span>}
        </Eyebrow>
        {headline ? (
          <h1 className="max-w-[26ch] font-reading text-[28px] font-medium leading-[1.15] tracking-[-0.01em] text-foreground text-balance sm:text-[34px]">
            {headline.before}
            {headline.emphasis && <em className="italic text-primary">{headline.emphasis}</em>}
            {headline.after}
          </h1>
        ) : (
          <div aria-hidden className="h-20 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
        )}
      </div>
      <ActionButton action={action} variant="default" className="h-9 px-4" />
    </header>
  );
}
