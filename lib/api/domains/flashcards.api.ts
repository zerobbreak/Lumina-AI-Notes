import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { FlashcardDeckDto } from "@/types/api/decks";
import type { FlashcardDto, FlashcardTodayQueueDto } from "@/types/api/flashcards";

export const flashcardsApi = {
  getTodayQueue(token: string) {
    return apiFetch<FlashcardTodayQueueDto>(apiPath`/flashcards/today-queue`, { token });
  },

  getDecks(token: string) {
    return apiFetch<FlashcardDeckDto[]>(apiPath`/flashcards/decks`, { token });
  },

  getDeck(token: string, deckId: string) {
    return apiFetch<FlashcardDeckDto>(apiPath`/flashcards/decks/${deckId}`, { token });
  },

  getCards(token: string, deckId: string) {
    return apiFetch<FlashcardDto[]>(apiPath`/flashcards/decks/${deckId}/cards`, { token });
  },

  deleteDeck(token: string, deckId: string) {
    return apiFetch<void>(apiPath`/flashcards/decks/${deckId}`, { method: "DELETE", token });
  },

  markDeckStudied(token: string, deckId: string) {
    return apiFetch<void>(apiPath`/flashcards/decks/${deckId}/studied`, {
      method: "POST",
      token,
    });
  },

  scheduleNextReview(
    token: string,
    cardId: string,
    body: { rating: "easy" | "medium" | "hard"; tzOffsetMinutes?: number },
  ) {
    return apiFetch<{ cardId: string; nextReviewAt: number; interval: number }>(
      apiPath`/flashcards/cards/${cardId}/schedule`,
      { method: "POST", token, body },
    );
  },
};
