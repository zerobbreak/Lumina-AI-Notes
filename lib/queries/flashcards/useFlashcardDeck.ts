"use client";

import { useQuery } from "@tanstack/react-query";
import { toFlashcardDeck } from "@/lib/api/adapters/deck";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { flashcardKeys } from "@/lib/query-keys/flashcards";

export function useFlashcardDeck(deckId: string | undefined, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: flashcardKeys.deck(deckId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return toFlashcardDeck(await flashcardsApi.getDeck(token, deckId!));
    },
    enabled: isReady && enabled && !!deckId,
  });
}
