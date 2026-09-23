"use client";

import { useQuery } from "@tanstack/react-query";
import { toFlashcardDecks } from "@/lib/api/adapters/deck";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { flashcardKeys } from "@/lib/query-keys/flashcards";

export function useFlashcardDecks(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: flashcardKeys.decks(),
    queryFn: async () => {
      const token = await getApiToken();
      return toFlashcardDecks(await flashcardsApi.getDecks(token));
    },
    enabled: isRestApiEnabled() && isReady && enabled,
  });
}
