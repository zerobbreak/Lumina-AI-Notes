import type { CalendarNote, CalendarRecording, CalendarStudyDay } from "@/lib/api/adapters/calendar";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";

/**
 * The month calendar's arithmetic: which days the grid shows, what lands on
 * each, how heavy each week is. Pure, so the view stays about layout.
 */

/** A week with this many things due is flagged as a crunch. */
export const CRUNCH_THRESHOLD = 3;

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(at: Date | number): string {
  const d = typeof at === "number" ? new Date(at) : at;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** ISO 8601 week number: weeks start Monday, week 1 holds the year's first Thursday. */
export function isoWeek(date: Date): number {
  const thursday = addDays(date, 3 - ((date.getDay() + 6) % 7));
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  return 1 + Math.floor(Math.round((thursday.getTime() - jan1.getTime()) / 86_400_000) / 7);
}

/** Whole weeks, Sunday first, covering every day of the month: four to six rows. */
export function monthWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = addDays(first, -first.getDay());
  const weeks: Date[][] = [];
  for (let cursor = start; cursor <= last; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
  }
  return weeks;
}

/** From the first shown day's midnight to the last shown day's last millisecond. */
export function weeksRange(weeks: Date[][]) {
  const first = weeks[0]![0]!;
  const last = weeks.at(-1)![6]!;
  return {
    startMs: first.getTime(),
    endMs: new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999).getTime(),
  };
}

export type StudyCounts = { reviews: number; quizzes: number; recordedMinutes: number };

export type DayBundle = {
  deadlines: DeadlineModel[];
  recordings: CalendarRecording[];
  notes: CalendarNote[];
  study: StudyCounts;
};

const emptyBundle = (): DayBundle => ({
  deadlines: [],
  recordings: [],
  notes: [],
  study: { reviews: 0, quizzes: 0, recordedMinutes: 0 },
});

export function bundleByDay(input: {
  deadlines: DeadlineModel[];
  recordings: CalendarRecording[];
  notes: CalendarNote[];
  study: CalendarStudyDay[];
}): Map<string, DayBundle> {
  const map = new Map<string, DayBundle>();
  const at = (key: string) => {
    if (!map.has(key)) map.set(key, emptyBundle());
    return map.get(key)!;
  };
  for (const d of input.deadlines) at(dayKey(d.dueAt)).deadlines.push(d);
  for (const r of input.recordings) {
    const day = at(dayKey(r.createdAt));
    day.recordings.push(r);
    day.study.recordedMinutes += Math.round((r.duration ?? 0) / 60);
  }
  for (const n of input.notes) at(dayKey(n.createdAt)).notes.push(n);
  for (const s of input.study) {
    const day = at(s.day);
    day.study.reviews += s.reviews;
    day.study.quizzes += s.quizzes;
  }
  for (const day of map.values()) day.deadlines.sort(byUrgency);
  return map;
}

export const isDone = (d: DeadlineModel) => d.completedAt !== undefined;
/** Something to hand in or sit, as opposed to an event on the calendar. */
export const isWork = (d: DeadlineModel) => d.kind !== "event";
export const isOverdue = (d: DeadlineModel, now: number) => isWork(d) && !isDone(d) && d.dueAt < now;

/** Open work before events, events before finished work; exams first, then by time. */
function byUrgency(a: DeadlineModel, b: DeadlineModel) {
  const rank = (d: DeadlineModel) => (isDone(d) ? 3 : d.kind === "event" ? 2 : d.kind === "exam" ? 0 : 1);
  return rank(a) - rank(b) || a.dueAt - b.dueAt;
}

/** How many things are due in a week, counting finished ones: it's the week's weight. */
export function weekLoad(week: Date[], byDay: Map<string, DayBundle>) {
  const count = week.reduce((n, day) => n + (byDay.get(dayKey(day))?.deadlines.filter(isWork).length ?? 0), 0);
  return { count, crunch: count >= CRUNCH_THRESHOLD };
}

/**
 * Rough minutes of study, for the bar under each day: about half a minute a
 * card, ten a quiz, and whatever was recorded.
 */
export function studyMinutes(study: StudyCounts) {
  return Math.round(study.reviews * 0.5 + study.quizzes * 10 + study.recordedMinutes);
}

/** "18 cards · 1 quiz · 52 min recorded", or null for a day with none. */
export function studyLine(study: StudyCounts) {
  const parts: string[] = [];
  if (study.reviews) parts.push(`${study.reviews} card${study.reviews === 1 ? "" : "s"}`);
  if (study.quizzes) parts.push(`${study.quizzes} quiz${study.quizzes === 1 ? "" : "zes"}`);
  if (study.recordedMinutes) parts.push(`${study.recordedMinutes} min recorded`);
  return parts.length ? parts.join(" · ") : null;
}

export type CalendarFilters = {
  /** Module ids hidden from the calendar; "none" is work with no module. */
  hiddenCourses: string[];
  events: boolean;
  completed: boolean;
  activity: boolean;
};

export const DEFAULT_FILTERS: CalendarFilters = { hiddenCourses: [], events: true, completed: true, activity: true };

export function applyFilters(deadlines: DeadlineModel[], filters: CalendarFilters) {
  return deadlines.filter(
    (d) =>
      !filters.hiddenCourses.includes(d.courseId ?? "none") &&
      (filters.events || d.kind !== "event") &&
      (filters.completed || !isDone(d)),
  );
}

export type MonthTotals = { due: number; done: number; overdue: number; studyDays: number };

/** Totals for the days of one month (not the neighbouring days the grid also shows). */
export function monthTotals(year: number, month: number, byDay: Map<string, DayBundle>, now: number): MonthTotals {
  const totals: MonthTotals = { due: 0, done: 0, overdue: 0, studyDays: 0 };
  for (const [key, day] of byDay) {
    const date = fromDayKey(key);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const work = day.deadlines.filter(isWork);
    totals.due += work.length;
    totals.done += work.filter(isDone).length;
    totals.overdue += work.filter((d) => isOverdue(d, now)).length;
    if (studyMinutes(day.study) > 0 || day.notes.length > 0) totals.studyDays += 1;
  }
  return totals;
}
