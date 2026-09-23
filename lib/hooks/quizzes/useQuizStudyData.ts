"use client";

import { useQuizDeck } from "@/lib/queries/quizzes/useQuizDeck";
import { useQuizQuestions } from "@/lib/queries/quizzes/useQuizQuestions";

export function useQuizStudyData(deckId: string) {
  const deckRest = useQuizDeck(deckId);
  const questionsRest = useQuizQuestions(deckId);

  const deck = deckRest.isLoading ? undefined : deckRest.data;
  const questions = questionsRest.isLoading ? undefined : questionsRest.data;

  return { deck, questions };
}
