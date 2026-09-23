"use client";

import { useFlashcardDeck } from "@/lib/queries/flashcards/useFlashcardDeck";
import { useFlashcards } from "@/lib/queries/flashcards/useFlashcards";

export function useFlashcardStudyData(deckId: string) {
  const deckRest = useFlashcardDeck(deckId);
  const cardsRest = useFlashcards(deckId);

  const deck = deckRest.isLoading ? undefined : deckRest.data;
  const flashcards = cardsRest.isLoading ? undefined : cardsRest.data;

  return { deck, flashcards };
}
