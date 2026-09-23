"use client";

import { useQuery } from "@tanstack/react-query";
import { toQuizDeck } from "@/lib/api/adapters/deck";
import { quizzesApi } from "@/lib/api/domains/quizzes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { quizKeys } from "@/lib/query-keys/quizzes";

export function useQuizDeck(deckId: string | undefined, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: quizKeys.deck(deckId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return toQuizDeck(await quizzesApi.getDeck(token, deckId!));
    },
    enabled: isReady && enabled && !!deckId,
  });
}
