import { describe, expect, it } from "vitest";
import {
  dayDiff,
  dueLabel,
  dueSoonChip,
  formatMinutes,
  overdueLabel,
  planAction,
  planHeadline,
  pulseReason,
  timeAgo,
} from "@/lib/home/planCopy";
import type { CoursePulseDto, PlanItemDto } from "@/types/api/home";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// Local time, so the day boundaries hold in any test time zone.
const NOW = new Date(2026, 8, 24, 14, 0).getTime();

const deadlineItem = (kind: "overdue" | "deadline", dueAt: number, title = "POE Part 2"): PlanItemDto => ({
  kind,
  id: `deadline:${title}`,
  score: 90,
  minutes: 45,
  deadline: { id: title, title, dueAt, kind: "assignment", source: "manual", readiness: null },
});

describe("formatMinutes", () => {
  it("uses minutes under an hour and hours with minutes above", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(80)).toBe("1 hr 20 min");
  });
});

describe("date labels", () => {
  it("names today, tomorrow and this week's days, then falls back to a date", () => {
    expect(dueLabel(new Date(2026, 8, 24, 23, 59).getTime(), NOW)).toMatch(/^today at 23:59$/);
    expect(dueLabel(new Date(2026, 8, 25, 9, 0).getTime(), NOW)).toMatch(/^tomorrow at 09:00$/);
    expect(dueLabel(new Date(2026, 8, 29, 9, 0).getTime(), NOW)).toMatch(/ at 09:00$/);
    expect(dueLabel(new Date(2026, 9, 12, 9, 0).getTime(), NOW)).not.toMatch(/ at /);
  });

  it("counts calendar days, not 24-hour spans", () => {
    expect(dayDiff(new Date(2026, 8, 25, 0, 30).getTime(), NOW)).toBe(1);
    expect(dayDiff(new Date(2026, 8, 23, 23, 30).getTime(), NOW)).toBe(-1);
  });

  it("says how soon something is due, up to a week", () => {
    expect(dueSoonChip(NOW + 30 * 60_000, NOW)).toBe("Due within the hour");
    expect(dueSoonChip(NOW + 31 * HOUR, NOW)).toBe("Due in 31 hr");
    expect(dueSoonChip(NOW + 3 * DAY, NOW)).toBe("Due in 3 days");
    expect(dueSoonChip(NOW + 9 * DAY, NOW)).toBeNull();
  });

  it("says how late something is", () => {
    expect(overdueLabel(NOW - 30 * 60_000, NOW)).toBe("Just passed");
    expect(overdueLabel(NOW - 5 * HOUR, NOW)).toBe("5 hr overdue");
    expect(overdueLabel(NOW - 25 * HOUR, NOW)).toBe("1 day overdue");
    expect(overdueLabel(NOW - 3 * DAY, NOW)).toBe("3 days overdue");
  });

  it("describes how long ago something happened", () => {
    expect(timeAgo(NOW - 10_000, NOW)).toBe("just now");
    expect(timeAgo(NOW - 20 * 60_000, NOW)).toBe("20 min ago");
    expect(timeAgo(NOW - 2 * HOUR, NOW)).toBe("2 hr ago");
    expect(timeAgo(NOW - DAY, NOW)).toBe("yesterday");
    expect(timeAgo(NOW - 4 * DAY, NOW)).toBe("4 days ago");
  });
});

describe("planHeadline", () => {
  const plan = [deadlineItem("deadline", NOW + 5 * DAY), deadlineItem("deadline", NOW + 6 * DAY, "Essay")];

  it("counts the plan and sets the time apart for emphasis", () => {
    expect(planHeadline({ total: 2, done: 0, minutesLeft: 90, next: plan[0] }, true, NOW)).toEqual({
      before: "Two things today, about ",
      emphasis: "1 hr 30 min",
      after: ".",
    });
  });

  it("says what's left once something is ticked off", () => {
    expect(planHeadline({ total: 3, done: 1, minutesLeft: 45, next: plan[0] }, true, NOW).before).toBe(
      "Two things left, about ",
    );
    expect(planHeadline({ total: 2, done: 2, minutesLeft: 0 }, true, NOW)).toEqual({
      before: "That's everything for today. Nice work.",
    });
  });

  it("leads with an overdue item", () => {
    const { after } = planHeadline({ total: 1, done: 0, minutesLeft: 45, next: deadlineItem("overdue", NOW - DAY) }, true, NOW);
    expect(after).toBe(". Start with POE Part 2. It's overdue.");
  });

  it("leads with a deadline due within two days", () => {
    const next = deadlineItem("deadline", new Date(2026, 8, 25, 23, 59).getTime());
    const headline = planHeadline({ total: 1, done: 0, minutesLeft: 45, next }, true, NOW);
    expect(headline.before + headline.emphasis + headline.after).toBe(
      "One thing today, about 45 min. POE Part 2 is the one that can't wait.",
    );
  });

  it("has something to say when the plan is empty", () => {
    expect(planHeadline({ total: 0, done: 0, minutesLeft: 0 }, true, NOW).before).toMatch(/^Nothing is due today\./);
    expect(planHeadline({ total: 0, done: 0, minutesLeft: 0 }, false, NOW).before).toBe(
      "Add a course to get a plan for your day.",
    );
  });
});

describe("planAction", () => {
  it("sends each kind of item to where its work happens", () => {
    expect(planAction({ kind: "review", id: "review", score: 1, minutes: 5, dueCount: 3, byCourse: [] })).toEqual({
      label: "Start review",
      href: "/dashboard?view=flashcards",
    });
    const synced = deadlineItem("deadline", NOW + DAY);
    if (synced.kind === "deadline") synced.deadline.externalUrl = "https://lms.example.test/x";
    expect(planAction(synced)).toMatchObject({ label: "Open in Brightspace", external: true });
    const manual = deadlineItem("deadline", NOW + DAY);
    if (manual.kind === "deadline") manual.deadline.courseId = "c1";
    expect(planAction(manual)?.href).toBe("/dashboard?contextId=c1&contextType=course");
    expect(planAction(deadlineItem("deadline", NOW + DAY))).toBeNull();
  });
});

describe("pulseReason", () => {
  const pulse = (overrides: Partial<CoursePulseDto>): CoursePulseDto => ({
    courseId: "c",
    status: "on-track",
    reasons: [],
    readiness: null,
    recall: null,
    recallTrend: [],
    noteCount: 0,
    cardCount: 0,
    dueToday: 0,
    quizCount: 0,
    quizScore: null,
    lastStudiedAt: NOW,
    nextDeadline: null,
    overdueCount: 0,
    ...overrides,
  });
  const next = { id: "t", title: "Class test 2", dueAt: new Date(2026, 8, 25, 9, 0).getTime(), kind: "exam" as const, source: "manual" as const, readiness: 0.3 };

  it("explains the most important reason", () => {
    expect(pulseReason(pulse({ reasons: ["overdue"], overdueCount: 2 }), NOW)).toBe("2 overdue items.");
    expect(pulseReason(pulse({ reasons: ["low-readiness"], readiness: 0.3, nextDeadline: next }), NOW)).toMatch(
      /^Class test 2 is due tomorrow at 09:00 and you're about 30% ready\.$/,
    );
    expect(pulseReason(pulse({ reasons: ["low-recall"], recall: 0.42 }), NOW)).toBe(
      "Recall is down to 42% over the last 4 weeks.",
    );
    expect(pulseReason(pulse({ reasons: ["quiet"], lastStudiedAt: NOW - 20 * DAY }), NOW)).toBe("No study for 20 days.");
    expect(pulseReason(pulse({ reasons: ["quiet"], lastStudiedAt: null }), NOW)).toBe("Nothing studied here yet.");
    expect(pulseReason(pulse({}), NOW)).toBe("Nothing due in the next two weeks.");
  });
});
