/** Response from `GET /flashcards/today-queue`. */
export type FlashcardTodayQueueDto = {
  userId: string;
  date: number;
  cardIds: string[];
  createdAt: number;
  updatedAt: number;
};
