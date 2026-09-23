import { apiFetch } from "@/lib/api/client";
import type { QuizDeckDto } from "@/types/api/decks";

export const quizzesApi = {
  getDecks(token: string) {
    return apiFetch<QuizDeckDto[]>("/quizzes/decks", { token });
  },
};
