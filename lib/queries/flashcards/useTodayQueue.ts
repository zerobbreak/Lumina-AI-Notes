"use client";

import { useQuery } from "@tanstack/react-query";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { flashcardKeys } from "@/lib/query-keys/flashcards";

export function useTodayQueue() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: flashcardKeys.todayQueue(),
    queryFn: async () => {
      const token = await getApiToken();
      return flashcardsApi.getTodayQueue(token);
    },
    enabled: isReady,
  });
}
