import type { HomeSummaryDto, PlanItemDto } from "@/types/api/home";

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

/** The headline that replaces the greeting: how much there is, and where to start. */
export function planHeadline(
  summary: Pick<HomeSummaryDto, "plan" | "planMinutes">,
  hasCourses: boolean,
  now: number,
): { headline: string; lead?: string } {
  const { plan, planMinutes } = summary;
  if (plan.length === 0) {
    return hasCourses
      ? { headline: "Nothing is due today.", lead: "A good day to get ahead on something." }
      : { headline: "Add a course to get a plan for your day." };
  }

  const count = COUNT_WORDS[plan.length] ?? String(plan.length);
  const headline = `${count} thing${plan.length === 1 ? "" : "s"} today, about ${formatMinutes(planMinutes)}.`;
  return { headline, lead: leadFor(plan[0]!, now) };
}

function leadFor(first: PlanItemDto, now: number) {
  if (first.kind === "overdue") return `Start with ${first.deadline.title}. It's overdue.`;
  if (first.kind === "deadline" && first.deadline.dueAt - now < 2 * DAY) {
    return `${first.deadline.title} is due ${dueLabel(first.deadline.dueAt, now)}, so start there.`;
  }
  return undefined;
}
