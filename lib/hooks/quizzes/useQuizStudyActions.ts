"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { quizzesApi } from "@/lib/api/domains/quizzes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateQuizzes } from "@/lib/invalidation";

export function useQuizStudyActions() {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateQuizzes(queryClient);
  }, [queryClient]);

  const saveResult = useCallback(
    async (args: {
      deckId: Id<"quizDecks">;
      score: number;
      totalQuestions: number;
      answers: number[];
      timeSpent?: number;
      tzOffsetMinutes?: number;
    }) => {
      const token = await getApiToken();
      const { deckId, ...body } = args;
      await quizzesApi.saveResult(token, deckId, body);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const deleteDeck = useCallback(
    async (args: { deckId: Id<"quizDecks"> }) => {
      const token = await getApiToken();
      await quizzesApi.deleteDeck(token, args.deckId);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  return { saveResult, deleteDeck };
}
