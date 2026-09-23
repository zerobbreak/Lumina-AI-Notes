"use client";

import { useQuery } from "@tanstack/react-query";
import { toQuizDecks } from "@/lib/api/adapters/deck";
import { quizzesApi } from "@/lib/api/domains/quizzes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { quizKeys } from "@/lib/query-keys/quizzes";

export function useQuizDecks(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: quizKeys.decks(),
    queryFn: async () => {
      const token = await getApiToken();
      return toQuizDecks(await quizzesApi.getDecks(token));
    },
    enabled: isRestApiEnabled() && isReady && enabled,
  });
}
