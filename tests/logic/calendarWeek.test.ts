import { describe, expect, it } from "vitest";
import type { PlanItemDto } from "@/types/api/home";
import { dayKey } from "@/lib/calendar/month";
import { fitPlan, hourSpan, layoutLanes, weekOf } from "@/lib/calendar/week";

const review = (minutes: number, id = "review"): PlanItemDto =>
  ({ kind: "review", id, score: 1, minutes, dueCount: 10, byCourse: [] }) as unknown as PlanItemDto;

const block = (id: string, start: number, end: number) => ({ id, kind: "event" as const, start, end, title: id });

describe("weekOf", () => {
  it("is the Sunday-first week around the day", () => {
    const week = weekOf(new Date(2026, 8, 25));
    expect(week.map(dayKey)).toEqual([
      "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26",
    ]);
  });
});

describe("layoutLanes", () => {
  it("puts overlapping blocks side by side and lone ones full width", () => {
    const out = layoutLanes([block("a", 540, 600), block("b", 570, 630), block("c", 720, 780)]);
    const byId = Object.fromEntries(out.map((b) => [b.id, b]));
    expect(byId.a).toMatchObject({ lane: 0, lanes: 2 });
    expect(byId.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(byId.c).toMatchObject({ lane: 0, lanes: 1 });
  });

  it("reuses a lane once it frees up inside a cluster", () => {
    const out = layoutLanes([block("a", 0, 120), block("b", 0, 30), block("c", 60, 90)]);
    expect(out.find((b) => b.id === "c")).toMatchObject({ lane: 1, lanes: 2 });
  });
});

describe("fitPlan", () => {
  it("starts after now on a quarter hour and steps around busy time", () => {
    // Now 14:32; a class 15:00–16:00.
    const { placed, unplaced } = fitPlan([review(45, "a"), review(30, "b")], [{ start: 900, end: 960 }], 872);
    // 14:45–15:00 is too short for either, so both go after the class.
    expect(placed.map((b) => [b.start, b.end])).toEqual([
      [960, 1005],
      [1005, 1035],
    ]);
    expect(unplaced).toEqual([]);
  });

  it("gives back what doesn't fit before 22:00", () => {
    const { placed, unplaced } = fitPlan([review(60, "a"), review(60, "b")], [], 20 * 60);
    expect(placed).toHaveLength(1);
    expect(placed[0]).toMatchObject({ start: 1215, end: 1275 });
    expect(unplaced.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("hourSpan", () => {
  it("draws 07:00–23:00 unless something is outside it", () => {
    expect(hourSpan([])).toEqual({ first: 7, last: 23 });
    expect(hourSpan([{ start: 6 * 60 + 30, end: 7 * 60 + 30 }, { start: 23 * 60, end: 23 * 60 + 40 }])).toEqual({ first: 6, last: 24 });
  });
});
