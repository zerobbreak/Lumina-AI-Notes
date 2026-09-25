import type { CoursePulseDto, PlanItemDto } from "@/types/api/home";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five"];

/** "45 min", "1 hr", "1 hr 20 min". */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

/** Local calendar days from `now` to `at`: 0 today, 1 tomorrow, -1 yesterday. */
export function dayDiff(at: number, now: number) {
  return Math.round((startOfDay(at) - startOfDay(now)) / DAY);
}

/** "today at 23:59", "tomorrow at 09:00", "Fri at 23:59", "12 Oct". */
export function dueLabel(dueAt: number, now: number) {
  const days = dayDiff(dueAt, now);
  if (days === 0) return `today at ${time(dueAt)}`;
  if (days === 1) return `tomorrow at ${time(dueAt)}`;
  if (days > 1 && days < 7) {
    return `${new Date(dueAt).toLocaleDateString(undefined, { weekday: "short" })} at ${time(dueAt)}`;
  }
  return new Date(dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "Due in 5 hr", "Due in 3 days"; null beyond a week. */
export function dueSoonChip(dueAt: number, now: number) {
  const left = dueAt - now;
  if (left < HOUR) return "Due within the hour";
  if (left < 2 * DAY) return `Due in ${Math.round(left / HOUR)} hr`;
  if (left <= 7 * DAY) return `Due in ${Math.round(left / DAY)} days`;
  return null;
}

/** "3 hr overdue", "1 day overdue", "4 days overdue". */
export function overdueLabel(dueAt: number, now: number) {
  const hours = Math.floor((now - dueAt) / HOUR);
  if (hours < 1) return "Just passed";
  if (hours < 24) return `${hours} hr overdue`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} overdue`;
}

/** "just now", "20 min ago", "3 hr ago", "yesterday", "5 days ago". */
export function timeAgo(at: number, now: number) {
  const gap = now - at;
  if (gap < MINUTE) return "just now";
  if (gap < HOUR) return `${Math.floor(gap / MINUTE)} min ago`;
  const days = dayDiff(now, at);
  if (days === 0) return `${Math.floor(gap / HOUR)} hr ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export type Headline = { before: string; emphasis?: string; after?: string };

/**
 * The headline that replaces the greeting: how much is left, and where to
 * start. The time is split out so it can be set in the accent.
 */
export function planHeadline(
  { total, done, minutesLeft, next }: { total: number; done: number; minutesLeft: number; next?: PlanItemDto },
  hasCourses: boolean,
  now: number,
): Headline {
  if (total === 0) {
    return hasCourses
      ? { before: "Nothing is due today. A good day to get ahead on something." }
      : { before: "Add a module to get a plan for your day." };
  }
  if (done >= total) return { before: "That's everything for today. Nice work." };

  const left = total - done;
  const count = COUNT_WORDS[left] ?? String(left);
  const lead = next ? leadFor(next, now) : undefined;
  return {
    before: `${count} thing${left === 1 ? "" : "s"} ${done > 0 ? "left" : "today"}, about `,
    emphasis: formatMinutes(minutesLeft),
    after: `.${lead ? ` ${lead}` : ""}`,
  };
}

function leadFor(first: PlanItemDto, now: number) {
  if (first.kind === "overdue") return `Start with ${first.deadline.title}. It's overdue.`;
  if (first.kind === "deadline" && first.deadline.dueAt - now < 2 * DAY) {
    return `${first.deadline.title} is the one that can't wait.`;
  }
  return undefined;
}

export type PlanAction = { label: string; href: string; external?: boolean };

/** Where a plan item's work happens. */
export function planAction(item: PlanItemDto): PlanAction | null {
  if (item.kind === "review") return { label: "Start review", href: "/dashboard?view=flashcards" };
  if (item.kind === "weak-quiz") return { label: "Retake", href: `/dashboard?view=quizzes&deckId=${item.quizDeckId}` };
  const d = item.deadline;
  if (d.externalUrl) return { label: "Open in Brightspace", href: d.externalUrl, external: true };
  if (d.courseId) return { label: "Open module", href: `/dashboard?contextId=${d.courseId}&contextType=course` };
  return null;
}

/** One sentence on why a course has its status. */
export function pulseReason(pulse: CoursePulseDto, now: number) {
  const next = pulse.nextDeadline;
  const readiness = pulse.readiness === null ? null : Math.round(pulse.readiness * 100);
  switch (pulse.reasons[0]) {
    case "overdue":
      return `${pulse.overdueCount} overdue item${pulse.overdueCount === 1 ? "" : "s"}${next ? `, and ${next.title} is due ${dueLabel(next.dueAt, now)}` : ""}.`;
    case "low-readiness":
      return `${next!.title} is due ${dueLabel(next!.dueAt, now)} and you're about ${readiness}% ready.`;
    case "deadline-soon":
      return `${next!.title} is due ${dueLabel(next!.dueAt, now)}.`;
    case "low-recall":
      return `Recall is down to ${Math.round((pulse.recall ?? 0) * 100)}% over the last 4 weeks.`;
    case "quiet":
      return pulse.lastStudiedAt === null
        ? "Nothing studied here yet."
        : `No study for ${dayDiff(now, pulse.lastStudiedAt)} days.`;
    default:
      return next ? `Next up: ${next.title}, ${dueLabel(next.dueAt, now)}.` : "Nothing due in the next two weeks.";
  }
}
