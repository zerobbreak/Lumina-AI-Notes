import { describe, expect, it } from "vitest";
import { calculateStreakDays, DAY_IN_MS } from "@/lib/analytics";

describe("streak calculation", () => {
  it("counts consecutive days ending today", () => {
    const today = new Date("2026-02-03T00:00:00Z").getTime();
    const days = new Set<number>([
      today,
      today - DAY_IN_MS,
      today - 2 * DAY_IN_MS,
    ]);

    expect(calculateStreakDays(days, today)).toBe(3);
  });

  it("breaks on missing day", () => {
    const today = new Date("2026-02-03T00:00:00Z").getTime();
    const days = new Set<number>([today, today - 2 * DAY_IN_MS]);
    expect(calculateStreakDays(days, today)).toBe(1);
  });
});
