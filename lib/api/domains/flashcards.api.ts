import { apiFetch } from "@/lib/api/client";
import type { FlashcardDeckDto } from "@/types/api/decks";
import type { FlashcardTodayQueueDto } from "@/types/api/flashcards";

export const flashcardsApi = {
  getTodayQueue(token: string) {
    return apiFetch<FlashcardTodayQueueDto>("/flashcards/today-queue", { token });
  },

  getDecks(token: string) {
    return apiFetch<FlashcardDeckDto[]>("/flashcards/decks", { token });
  },
};
