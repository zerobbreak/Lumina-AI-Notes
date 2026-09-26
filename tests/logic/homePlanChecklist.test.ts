import { describe, expect, it } from "vitest";
import { checklistStorageKey, dayKey, mergeChecklist } from "@/lib/home/planChecklist";
import { prepDays } from "@/components/dashboard/home/RunwayStrip";
import type { PlanItemDto } from "@/types/api/home";

const item = (id: string): PlanItemDto => ({
  kind: "weak-quiz",
  id,
  score: 1,
  minutes: 10,
  quizDeckId: id,
  title: id,
  scorePercent: 40,
  takenAt: 0,
});

describe("mergeChecklist", () => {
  it("keeps ticked items where they were after the server drops them", () => {
    // "b" was second when ticked; the server no longer returns it.
    const rows = mergeChecklist([item("a"), item("c")], [{ item: item("b"), index: 1 }]);
    expect(rows.map((r) => [r.item.id, r.done])).toEqual([
      ["a", false],
      ["b", true],
      ["c", false],
    ]);
  });

  it("shows a ticked item once even while the server still returns it", () => {
    const rows = mergeChecklist([item("a"), item("b")], [{ item: item("a"), index: 0 }]);
    expect(rows.map((r) => [r.item.id, r.done])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("puts a ticked item at the end when the list has shrunk past its place", () => {
    const rows = mergeChecklist([], [{ item: item("z"), index: 3 }]);
    expect(rows).toEqual([{ item: item("z"), done: true }]);
  });
});

describe("dayKey", () => {
  it("names the local day", () => {
    expect(dayKey(new Date(2026, 8, 4, 23, 59).getTime())).toBe("2026-09-04");
  });

  it("scopes stored checklist details to the signed-in user", () => {
    const now = new Date(2026, 8, 4, 12).getTime();
    expect(checklistStorageKey("user-a", now)).not.toBe(checklistStorageKey("user-b", now));
    expect(checklistStorageKey("user-a", now)).toBe("lumina:home-plan-done:user-a:2026-09-04");
  });
});

describe("prepDays", () => {
  it("gives less prepared deadlines a longer run-up", () => {
    expect(prepDays(null)).toBe(3);
    expect(prepDays(1)).toBe(1);
    expect(prepDays(0.5)).toBe(4);
    expect(prepDays(0)).toBe(6);
  });
});
