import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  scheduleNextReviewFromRating,
} from "@/lib/spacedRepetition";

describe("scheduleNextReviewFromRating", () => {
  it("maps ratings to expected quality values", () => {
    const base = { easeFactor: DEFAULT_EASE_FACTOR, interval: 1, repetitions: 2 };
    const easy = scheduleNextReviewFromRating("easy", base);
    const medium = scheduleNextReviewFromRating("medium", base);
    const hard = scheduleNextReviewFromRating("hard", base);

    expect(easy.quality).toBe(5);
    expect(medium.quality).toBe(3);
    expect(hard.quality).toBe(1);
  });

  it("sets interval to 1 for first review", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-03T10:00:00Z"));
    const result = scheduleNextReviewFromRating("easy", {
      easeFactor: DEFAULT_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
    });

    expect(result.interval).toBe(1);
    expect(result.nextReviewAt).toBe(Date.now() + 1 * 24 * 60 * 60 * 1000);
    vi.useRealTimers();
  });

  it("sets interval to 6 for second review", () => {
    const result = scheduleNextReviewFromRating("medium", {
      easeFactor: DEFAULT_EASE_FACTOR,
      interval: 1,
      repetitions: 1,
    });

    expect(result.interval).toBe(6);
  });

  it("multiplies interval by ease factor for subsequent reviews", () => {
    const result = scheduleNextReviewFromRating("easy", {
      easeFactor: 2.5,
      interval: 6,
      repetitions: 2,
    });

    expect(result.interval).toBe(Math.round(6 * 2.5));
  });

  it("enforces ease factor floor", () => {
    const result = scheduleNextReviewFromRating("hard", {
      easeFactor: 1.3,
      interval: 6,
      repetitions: 2,
    });

    expect(result.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
  });
});
