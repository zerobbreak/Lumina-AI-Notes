import { describe, expect, it } from "vitest";
import { computePredictedReadyDate, DAY_IN_MS } from "@/lib/analytics";

describe("readiness forecast", () => {
  it("returns null when pace is zero", () => {
    const result = computePredictedReadyDate(10, 0, 0);
    expect(result).toBeNull();
  });

  it("predicts ready date based on cards remaining and pace", () => {
    const now = 0;
    const result = computePredictedReadyDate(20, 5, now);
    expect(result).toBe(4 * DAY_IN_MS);
  });
});
