import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { QuizDeckDto } from "@/types/api/decks";
import type { QuizQuestionDto } from "@/types/api/quizzes";

export const quizzesApi = {
  getDecks(token: string) {
    return apiFetch<QuizDeckDto[]>(apiPath`/quizzes/decks`, { token });
  },

  getDeck(token: string, deckId: string) {
    return apiFetch<QuizDeckDto>(apiPath`/quizzes/decks/${deckId}`, { token });
  },

  getQuestions(token: string, deckId: string) {
    return apiFetch<QuizQuestionDto[]>(apiPath`/quizzes/decks/${deckId}/questions`, { token });
  },

  deleteDeck(token: string, deckId: string) {
    return apiFetch<void>(apiPath`/quizzes/decks/${deckId}`, { method: "DELETE", token });
  },

  saveResult(
    token: string,
    deckId: string,
    body: {
      score: number;
      totalQuestions: number;
      answers: number[];
      timeSpent?: number;
      tzOffsetMinutes?: number;
    },
  ) {
    return apiFetch<{ id: string }>(apiPath`/quizzes/decks/${deckId}/results`, {
      method: "POST",
      token,
      body,
    });
  },
};
