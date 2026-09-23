"use client";

import { useQuery } from "@tanstack/react-query";
import { toFlashcards } from "@/lib/api/adapters/flashcard";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { flashcardKeys } from "@/lib/query-keys/flashcards";

export function useFlashcards(deckId: string | undefined, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: flashcardKeys.cards(deckId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return toFlashcards(await flashcardsApi.getCards(token, deckId!));
    },
    enabled: isReady && enabled && !!deckId,
  });
}
