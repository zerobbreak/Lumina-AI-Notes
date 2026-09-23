"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateFlashcards } from "@/lib/invalidation";

export function useFlashcardStudyActions() {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateFlashcards(queryClient);
  }, [queryClient]);

  const markStudied = useCallback(
    async (args: { deckId: Id<"flashcardDecks"> }) => {
      const token = await getApiToken();
      await flashcardsApi.markDeckStudied(token, args.deckId);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const scheduleNextReview = useCallback(
    async (args: {
      cardId: Id<"flashcards">;
      rating: "easy" | "medium" | "hard";
      tzOffsetMinutes?: number;
    }) => {
      const token = await getApiToken();
      await flashcardsApi.scheduleNextReview(token, args.cardId, {
        rating: args.rating,
        tzOffsetMinutes: args.tzOffsetMinutes,
      });
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const deleteDeck = useCallback(
    async (args: { deckId: Id<"flashcardDecks"> }) => {
      const token = await getApiToken();
      await flashcardsApi.deleteDeck(token, args.deckId);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  return { markStudied, scheduleNextReview, deleteDeck };
}
