import { describe, expect, it } from "vitest";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";
import {
  applyFilters,
  bundleByDay,
  dayKey,
  DEFAULT_FILTERS,
  isoWeek,
  monthTotals,
  monthWeeks,
  studyLine,
  studyMinutes,
  weekLoad,
  weeksRange,
} from "@/lib/calendar/month";

const deadline = (overrides: Partial<DeadlineModel>): DeadlineModel => ({
  _id: "d",
  userId: "u",
  title: "Deadline",
  dueAt: new Date(2026, 8, 25, 23, 59).getTime(),
  kind: "assignment",
  source: "manual",
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const empty = { recordings: [], notes: [], study: [] };

describe("monthWeeks", () => {
  it("covers September 2026 in five Sunday-first weeks", () => {
    const weeks = monthWeeks(2026, 8);
    expect(weeks).toHaveLength(5);
    expect(dayKey(weeks[0]![0]!)).toBe("2026-08-30");
    expect(dayKey(weeks[4]![6]!)).toBe("2026-10-03");
    expect(weeks.flat().every((d, i, all) => i === 0 || d.getTime() > all[i - 1]!.getTime())).toBe(true);
  });

  it("uses six weeks when the month needs them", () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(monthWeeks(2026, 7)).toHaveLength(6);
  });

  it("spans whole days", () => {
    const { startMs, endMs } = weeksRange(monthWeeks(2026, 8));
    expect(new Date(startMs)).toEqual(new Date(2026, 7, 30));
    expect(new Date(endMs)).toEqual(new Date(2026, 9, 3, 23, 59, 59, 999));
  });
});

describe("isoWeek", () => {
  it("numbers weeks the ISO way", () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeek(new Date(2026, 8, 21))).toBe(39);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53);
  });
});

describe("bundleByDay", () => {
  it("puts open exams first and finished work last", () => {
    const byDay = bundleByDay({
      ...empty,
      deadlines: [
        deadline({ _id: "done", completedAt: 1 }),
        deadline({ _id: "event", kind: "event" }),
        deadline({ _id: "essay" }),
        deadline({ _id: "exam", kind: "exam" }),
      ],
    });
    expect(byDay.get("2026-09-25")!.deadlines.map((d) => d._id)).toEqual(["exam", "essay", "event", "done"]);
  });

  it("adds recorded minutes to the day's study", () => {
    const byDay = bundleByDay({
      deadlines: [],
      notes: [],
      recordings: [{ _id: "r" as never, userId: "u", title: "Lecture", duration: 3120, createdAt: new Date(2026, 8, 25, 10).getTime() }],
      study: [{ day: "2026-09-25", reviews: 20, quizzes: 1 }],
    });
    const study = byDay.get("2026-09-25")!.study;
    expect(study).toEqual({ reviews: 20, quizzes: 1, recordedMinutes: 52 });
    expect(studyMinutes(study)).toBe(72);
    expect(studyLine(study)).toBe("20 cards · 1 quiz · 52 min recorded");
  });
});

describe("weekLoad", () => {
  it("flags a week with three things due, not counting events", () => {
    const week = monthWeeks(2026, 8)[4]!; // 27 Sep – 3 Oct
    const at = (d: number) => new Date(2026, 8, d, 12).getTime();
    const byDay = bundleByDay({
      ...empty,
      deadlines: [
        deadline({ _id: "a", dueAt: at(28) }),
        deadline({ _id: "b", dueAt: at(29), kind: "exam" }),
        deadline({ _id: "c", dueAt: at(30), kind: "event" }),
      ],
    });
    expect(weekLoad(week, byDay)).toEqual({ count: 2, crunch: false });
    byDay.get("2026-09-30")!.deadlines.push(deadline({ _id: "d", dueAt: at(30) }));
    expect(weekLoad(week, byDay)).toEqual({ count: 3, crunch: true });
  });
});

describe("applyFilters", () => {
  const list = [
    deadline({ _id: "prog", courseId: "prog" }),
    deadline({ _id: "loose" }),
    deadline({ _id: "event", kind: "event", courseId: "prog" }),
    deadline({ _id: "done", completedAt: 1 }),
  ];
  it("keeps everything by default", () => {
    expect(applyFilters(list, DEFAULT_FILTERS)).toHaveLength(4);
  });
  it("hides modules, events and finished work", () => {
    expect(applyFilters(list, { ...DEFAULT_FILTERS, hiddenCourses: ["prog"] }).map((d) => d._id)).toEqual(["loose", "done"]);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, events: false, completed: false }).map((d) => d._id)).toEqual(["prog", "loose"]);
  });
});

describe("monthTotals", () => {
  it("counts only the month's own days", () => {
    const now = new Date(2026, 8, 25, 14).getTime();
    const byDay = bundleByDay({
      deadlines: [
        deadline({ _id: "late", dueAt: new Date(2026, 8, 18, 23).getTime() }),
        deadline({ _id: "done", dueAt: new Date(2026, 8, 4, 23).getTime(), completedAt: 1 }),
        deadline({ _id: "next", dueAt: new Date(2026, 9, 2, 23).getTime() }),
        deadline({ _id: "event", kind: "event", dueAt: new Date(2026, 8, 15, 10).getTime() }),
      ],
      recordings: [],
      notes: [],
      study: [
        { day: "2026-09-24", reviews: 5, quizzes: 0 },
        { day: "2026-10-01", reviews: 5, quizzes: 0 },
      ],
    });
    expect(monthTotals(2026, 8, byDay, now)).toEqual({ due: 2, done: 1, overdue: 1, studyDays: 1 });
  });
});
