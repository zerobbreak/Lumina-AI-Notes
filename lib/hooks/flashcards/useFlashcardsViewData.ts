"use client";

import { useFlashcardDecks } from "@/lib/queries/flashcards/useFlashcardDecks";

export function useFlashcardsViewData() {
  const decksRest = useFlashcardDecks();
  return decksRest.isLoading ? undefined : decksRest.data;
}
