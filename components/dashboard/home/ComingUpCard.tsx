"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { dispatchAppCommand } from "@/lib/appCommands";
import { overdueLabel } from "@/lib/home/planCopy";
import { useBrightspaceStatus } from "@/lib/queries/integrations/useBrightspaceStatus";
import type { HomeDeadlineDto } from "@/types/api/home";
import { Chip, Eyebrow, HomeCard, courseLabel, type CourseLookup } from "./parts";

const MAX_ROWS = 6;
/** Old overdue items shouldn't crowd out what's next. */
const MAX_OVERDUE_ROWS = 3;

/** "FRI 06" inside two weeks; "06 NOV" further out, where the weekday alone is ambiguous. */
const dayTag = (ms: number, now: number) => {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  if (Math.abs(ms - now) >= 13 * 86_400_000) {
    return `${day} ${d.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}`;
  }
  return `${d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()} ${day}`;
};

/** Overdue work and the next deadlines, one line each. */
export function ComingUpCard({
  overdue,
  upcoming,
  courseOf,
  now,
}: {
  overdue: HomeDeadlineDto[];
  upcoming: HomeDeadlineDto[];
  courseOf: CourseLookup;
  now: number;
}) {
  const { data: brightspace } = useBrightspaceStatus();
  // The most recent overdue items, then what's next, capped so the card stays short.
  const lateShown = overdue.slice(0, MAX_OVERDUE_ROWS);
  const lateHidden = overdue.length - lateShown.length;
  const nextShown = upcoming.slice(0, MAX_ROWS - lateShown.length);
  const shown = [...lateShown.reverse().map((d) => ({ d, overdue: true })), ...nextShown.map((d) => ({ d, overdue: false }))];
  const more = upcoming.length - nextShown.length;

  return (
    <HomeCard aria-labelledby="coming-up-heading" className="px-5 py-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <Eyebrow id="coming-up-heading">Coming up</Eyebrow>
        <Link href="/dashboard?view=calendar" className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline">
          Calendar
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="py-2 text-[13px] text-muted-foreground">Nothing due in the next two weeks.</p>
      ) : (
        <ul>
          {shown.map(({ d, overdue: late }) => {
            const course = courseOf(d.courseId);
            return (
              <li
                key={d.id}
                className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2.5 border-b border-border/70 py-2 text-[13px] last:border-b-0"
              >
                <span className="font-mono text-[11.5px] text-muted-foreground">{dayTag(d.dueAt, now)}</span>
                {d.externalUrl ? (
                  <a href={d.externalUrl} target="_blank" rel="noopener noreferrer" className="truncate text-foreground hover:underline">
                    {d.title}
                    <span className="sr-only"> (opens Brightspace in a new tab)</span>
                  </a>
                ) : (
                  <span className="truncate text-foreground">{d.title}</span>
                )}
                {late ? (
                  <Chip tone="critical">{overdueLabel(d.dueAt, now)}</Chip>
                ) : (
                  <span className="font-mono text-[11.5px] text-muted-foreground">{course ? courseLabel(course) : d.kind}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(more > 0 || lateHidden > 0) && (
        <Link href="/dashboard?view=calendar" className="mt-2 inline-block text-xs text-muted-foreground hover:text-primary hover:underline">
          {[lateHidden > 0 && `${lateHidden} more overdue`, more > 0 && `${more} more coming up`].filter(Boolean).join(", ")} in the
          calendar
        </Link>
      )}
      {brightspace && !brightspace.connected && (
        <button
          type="button"
          onClick={() => dispatchAppCommand("settings:integrations")}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-foreground/5"
        >
          <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Use Brightspace? Bring your due dates in automatically.
        </button>
      )}
      {brightspace?.connected && brightspace.status === "error" && (
        <button
          type="button"
          onClick={() => dispatchAppCommand("settings:integrations")}
          className="mt-3 w-full rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-foreground hover:bg-destructive/10"
        >
          Brightspace stopped syncing. Fix it in settings.
        </button>
      )}
    </HomeCard>
  );
}
