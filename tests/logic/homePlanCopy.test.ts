import { describe, expect, it } from "vitest";
import {
  dayDiff,
  dueLabel,
  dueSoonChip,
  formatMinutes,
  overdueLabel,
  planHeadline,
  timeAgo,
} from "@/lib/home/planCopy";
import type { PlanItemDto } from "@/types/api/home";

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
  it("counts the plan and totals its time", () => {
    const plan = [deadlineItem("deadline", NOW + 5 * DAY), deadlineItem("deadline", NOW + 6 * DAY, "Essay")];
    expect(planHeadline({ plan, planMinutes: 90 }, true, NOW)).toEqual({
      headline: "Two things today, about 1 hr 30 min.",
      lead: undefined,
    });
  });

  it("leads with an overdue item", () => {
    const { lead } = planHeadline({ plan: [deadlineItem("overdue", NOW - DAY)], planMinutes: 45 }, true, NOW);
    expect(lead).toBe("Start with POE Part 2. It's overdue.");
  });

  it("leads with a deadline due within two days", () => {
    const dueAt = new Date(2026, 8, 25, 23, 59).getTime();
    const { headline, lead } = planHeadline({ plan: [deadlineItem("deadline", dueAt)], planMinutes: 45 }, true, NOW);
    expect(headline).toBe("One thing today, about 45 min.");
    expect(lead).toMatch(/^POE Part 2 is due tomorrow at 23:59, so start there\.$/);
  });

  it("has something to say when the plan is empty", () => {
    expect(planHeadline({ plan: [], planMinutes: 0 }, true, NOW).headline).toBe("Nothing is due today.");
    expect(planHeadline({ plan: [], planMinutes: 0 }, false, NOW).headline).toBe(
      "Add a course to get a plan for your day.",
    );
  });
});
