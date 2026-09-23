"use client";

import { useQuizDecks } from "@/lib/queries/quizzes/useQuizDecks";

export function useQuizzesViewData() {
  const decksRest = useQuizDecks();
  return decksRest.isLoading ? undefined : decksRest.data;
}
