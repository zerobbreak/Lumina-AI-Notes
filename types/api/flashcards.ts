/** Response from `GET /flashcards/today-queue`. */
export type FlashcardTodayQueueDto = {
  userId: string;
  date: number;
  cardIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type FlashcardDto = {
  id: string;
  userId?: string | null;
  deckId: string;
  front: string;
  back: string;
  position?: number;
  difficulty?: number | null;
  nextReviewAt?: string | number | null;
  reviewCount?: number | null;
  lastReviewedAt?: string | number | null;
  easeFactor?: number | null;
  interval?: number | null;
  repetitions?: number | null;
  lastRating?: string | null;
  createdAt?: string | number;
};
