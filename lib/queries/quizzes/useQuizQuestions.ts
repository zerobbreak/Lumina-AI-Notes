"use client";

import { useQuery } from "@tanstack/react-query";
import { toQuizQuestions } from "@/lib/api/adapters/quiz";
import { quizzesApi } from "@/lib/api/domains/quizzes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { quizKeys } from "@/lib/query-keys/quizzes";

export function useQuizQuestions(deckId: string | undefined, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: quizKeys.questions(deckId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return toQuizQuestions(await quizzesApi.getQuestions(token, deckId!));
    },
    enabled: isReady && enabled && !!deckId,
  });
}
