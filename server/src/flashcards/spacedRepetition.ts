/** Port of lib/spacedRepetition.ts — only what the API needs. */

export const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

export type ReviewRating = "easy" | "medium" | "hard";
type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

const RATING_TO_QUALITY: Record<ReviewRating, ReviewQuality> = {
  easy: 5,
  medium: 3,
  hard: 1,
};

export interface ScheduleFromRatingInput {
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
}

export interface ScheduleFromRatingResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewAt: number;
}

/** Matches convex/flashcards.ts scheduleNextReviewFromRating via lib/spacedRepetition. */
export function scheduleNextReviewFromRating(
  rating: ReviewRating,
  current: ScheduleFromRatingInput | null,
): ScheduleFromRatingResult {
  const now = Date.now();
  const quality = RATING_TO_QUALITY[rating];

  let easeFactor = current?.easeFactor ?? DEFAULT_EASE_FACTOR;
  let interval = current?.interval ?? 0;
  const repetitions = current?.repetitions ?? 0;

  if (repetitions === 0) {
    interval = 1;
  } else if (repetitions === 1) {
    interval = 6;
  } else {
    interval = Math.round(interval * easeFactor);
  }

  const efChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + efChange);

  const nextReviewAt = now + interval * 24 * 60 * 60 * 1000;

  return {
    easeFactor,
    interval,
    repetitions: repetitions + 1,
    nextReviewAt,
    lastReviewAt: now,
  };
}
