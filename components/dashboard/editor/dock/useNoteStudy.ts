"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { quizzesApi } from "@/lib/api/domains/quizzes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { useFlashcardDecks } from "@/lib/queries/flashcards/useFlashcardDecks";
import { useQuizDecks } from "@/lib/queries/quizzes/useQuizDecks";
import { flashcardKeys } from "@/lib/query-keys/flashcards";
import { quizKeys } from "@/lib/query-keys/quizzes";

/**
 * The flashcard decks and quizzes made from one note (their `sourceNoteId`),
 * with review counts across the decks and the newest quiz's last score.
 */
export function useNoteStudy(noteId: string) {
  const { getApiToken, isReady } = useApiToken();
  const decksQuery = useFlashcardDecks();
  const quizzesQuery = useQuizDecks();

  const decks = useMemo(
    () => (decksQuery.data ?? []).filter((d) => d.sourceNoteId === noteId),
    [decksQuery.data, noteId],
  );
  const quizzes = useMemo(
    () =>
      (quizzesQuery.data ?? [])
        .filter((q) => q.sourceNoteId === noteId)
        .sort((a, b) => (b.lastTakenAt ?? b.createdAt) - (a.lastTakenAt ?? a.createdAt)),
    [quizzesQuery.data, noteId],
  );

  const stats = useQueries({
    queries: decks.map((deck) => ({
      queryKey: flashcardKeys.deckStats(deck._id),
      queryFn: async () => flashcardsApi.getDeckStats(await getApiToken(), deck._id),
      enabled: isReady,
    })),
  });

  const quiz = quizzes[0] ?? null;
  const latestResult = useQuery({
    queryKey: quizKeys.latestResult(quiz?._id ?? "none"),
    queryFn: async () => quizzesApi.getLatestResult(await getApiToken(), quiz!._id),
    enabled: isReady && quiz !== null,
  });

  const totals = stats.reduce(
    (sum, q) => {
      const s = q.data;
      if (!s) return sum;
      return {
        cards: sum.cards + s.totalCards,
        due: sum.due + s.dueNow,
        fresh: sum.fresh + s.newCards,
      };
    },
    { cards: 0, due: 0, fresh: 0 },
  );

  return {
    isLoading: decksQuery.isLoading || quizzesQuery.isLoading,
    decks,
    primaryDeck: decks[0] ?? null,
    quiz,
    latestResult: latestResult.data ?? null,
    cards: totals.cards,
    due: totals.due,
    fresh: totals.fresh,
  };
}
