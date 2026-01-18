/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * 
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 * 
 * Quality ratings:
 * 0 - Complete blackout, no recall at all
 * 1 - Incorrect response, but upon seeing correct answer, remembered
 * 2 - Incorrect response, but correct one seemed easy to recall
 * 3 - Correct response with serious difficulty
 * 4 - Correct response after some hesitation
 * 5 - Perfect response with no hesitation
 */

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface CardReviewData {
  easeFactor: number;    // EF - Easiness factor (minimum 1.3)
  interval: number;      // I - Inter-repetition interval in days
  repetitions: number;   // n - Number of successful repetitions
  nextReviewAt: number;  // Timestamp for next review
  lastReviewAt?: number; // Timestamp of last review
}

export interface ReviewResult extends CardReviewData {
  wasSuccessful: boolean;
}

// Default values for new cards
export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;

/**
 * Calculate the new review state after a review session
 * 
 * @param quality - User's self-reported quality of recall (0-5)
 * @param currentData - Current card review data (null for new cards)
 * @returns Updated review data
 */
export function calculateNextReview(
  quality: ReviewQuality,
  currentData: Partial<CardReviewData> | null
): ReviewResult {
  const now = Date.now();
  
  // Initialize values for new cards or use existing
  let easeFactor = currentData?.easeFactor ?? DEFAULT_EASE_FACTOR;
  let interval = currentData?.interval ?? 0;
  let repetitions = currentData?.repetitions ?? 0;
  
  // Quality < 3 means the response was incorrect or too difficult
  const wasSuccessful = quality >= 3;
  
  if (!wasSuccessful) {
    // Reset repetitions but keep the ease factor adjustment
    repetitions = 0;
    interval = 1; // Review again in 1 day
  } else {
    // Successful recall - increase interval
    repetitions += 1;
    
    if (repetitions === 1) {
      interval = 1; // First successful review: 1 day
    } else if (repetitions === 2) {
      interval = 6; // Second successful review: 6 days
    } else {
      // Subsequent reviews: multiply previous interval by ease factor
      interval = Math.round(interval * easeFactor);
    }
  }
  
  // Update ease factor using SM-2 formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const efChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + efChange);
  
  // Calculate next review timestamp
  const nextReviewAt = now + interval * 24 * 60 * 60 * 1000;
  
  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewAt,
    lastReviewAt: now,
    wasSuccessful,
  };
}

/**
 * Get a human-readable description of when the next review is due
 */
export function getNextReviewDescription(nextReviewAt: number): string {
  const now = Date.now();
  const diff = nextReviewAt - now;
  
  if (diff <= 0) {
    return "Due now";
  }
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `Due in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else if (hours < 24) {
    return `Due in ${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (days === 1) {
    return "Due tomorrow";
  } else if (days < 7) {
    return `Due in ${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Due in ${weeks} week${weeks !== 1 ? "s" : ""}`;
  } else {
    const months = Math.floor(days / 30);
    return `Due in ${months} month${months !== 1 ? "s" : ""}`;
  }
}

/**
 * Get the quality label for user-friendly display
 */
export function getQualityLabel(quality: ReviewQuality): string {
  const labels: Record<ReviewQuality, string> = {
    0: "Complete Blackout",
    1: "Wrong, but remembered after",
    2: "Wrong, but seemed familiar",
    3: "Correct with difficulty",
    4: "Correct after hesitation",
    5: "Perfect recall",
  };
  return labels[quality];
}

/**
 * Get a simplified quality option for UI
 * Maps common user responses to SM-2 quality ratings
 */
export interface SimpleQualityOption {
  label: string;
  description: string;
  quality: ReviewQuality;
  color: string;
  shortcut: string;
}

export const SIMPLE_QUALITY_OPTIONS: SimpleQualityOption[] = [
  {
    label: "Again",
    description: "Didn't know it",
    quality: 0,
    color: "red",
    shortcut: "1",
  },
  {
    label: "Hard",
    description: "Struggled to recall",
    quality: 3,
    color: "orange",
    shortcut: "2",
  },
  {
    label: "Good",
    description: "Recalled with effort",
    quality: 4,
    color: "blue",
    shortcut: "3",
  },
  {
    label: "Easy",
    description: "Instant recall",
    quality: 5,
    color: "green",
    shortcut: "4",
  },
];

/**
 * Calculate study statistics for a deck
 */
export interface DeckStats {
  totalCards: number;
  newCards: number;        // Never reviewed
  learningCards: number;   // Repetitions < 3
  reviewCards: number;     // Repetitions >= 3
  dueNow: number;          // Due for review
  dueToday: number;        // Due within 24 hours
  averageEaseFactor: number;
  masteredCards: number;   // Interval > 21 days
}

export function calculateDeckStats(
  cards: Array<{
    nextReviewAt?: number;
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    reviewCount?: number;
  }>
): DeckStats {
  const now = Date.now();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const endOfDayTimestamp = endOfDay.getTime();
  
  let newCards = 0;
  let learningCards = 0;
  let reviewCards = 0;
  let dueNow = 0;
  let dueToday = 0;
  let masteredCards = 0;
  let totalEaseFactor = 0;
  let cardsWithEaseFactor = 0;
  
  for (const card of cards) {
    const repetitions = card.repetitions ?? card.reviewCount ?? 0;
    const interval = card.interval ?? 0;
    const easeFactor = card.easeFactor ?? DEFAULT_EASE_FACTOR;
    const nextReview = card.nextReviewAt;
    
    // Categorize by learning stage
    if (repetitions === 0) {
      newCards++;
    } else if (repetitions < 3) {
      learningCards++;
    } else {
      reviewCards++;
    }
    
    // Check if mastered (interval > 21 days)
    if (interval > 21) {
      masteredCards++;
    }
    
    // Check if due
    if (!nextReview || nextReview <= now) {
      dueNow++;
    } else if (nextReview <= endOfDayTimestamp) {
      dueToday++;
    }
    
    // Track ease factor
    if (card.easeFactor) {
      totalEaseFactor += easeFactor;
      cardsWithEaseFactor++;
    }
  }
  
  return {
    totalCards: cards.length,
    newCards,
    learningCards,
    reviewCards,
    dueNow,
    dueToday,
    averageEaseFactor: cardsWithEaseFactor > 0 
      ? totalEaseFactor / cardsWithEaseFactor 
      : DEFAULT_EASE_FACTOR,
    masteredCards,
  };
}

/**
 * Sort cards for optimal study order:
 * 1. Due cards (overdue first)
 * 2. New cards
 * 3. Future cards (sorted by next review date)
 */
export function sortCardsForStudy<T extends { nextReviewAt?: number; reviewCount?: number }>(
  cards: T[]
): T[] {
  const now = Date.now();
  
  return [...cards].sort((a, b) => {
    const aNextReview = a.nextReviewAt ?? 0;
    const bNextReview = b.nextReviewAt ?? 0;
    const aIsNew = !a.reviewCount || a.reviewCount === 0;
    const bIsNew = !b.reviewCount || b.reviewCount === 0;
    const aIsDue = !aNextReview || aNextReview <= now;
    const bIsDue = !bNextReview || bNextReview <= now;
    
    // Due cards first
    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;
    
    // Among due cards, sort by how overdue they are
    if (aIsDue && bIsDue) {
      // New cards after overdue cards
      if (aIsNew && !bIsNew) return 1;
      if (!aIsNew && bIsNew) return -1;
      
      // Sort by next review (most overdue first)
      return aNextReview - bNextReview;
    }
    
    // Future cards sorted by next review date
    return aNextReview - bNextReview;
  });
}
