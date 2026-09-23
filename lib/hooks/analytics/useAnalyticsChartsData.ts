"use client";

import { useMemo } from "react";
import { useBurnoutStats } from "@/lib/queries/analytics/useBurnoutStats";
import { useDailyStudyActivity } from "@/lib/queries/analytics/useDailyStudyActivity";
import { useDeckPerformance } from "@/lib/queries/analytics/useDeckPerformance";
import { useReadinessForecast } from "@/lib/queries/analytics/useReadinessForecast";
import { useWeakTopics } from "@/lib/queries/analytics/useWeakTopics";
import { useFlashcardDecks } from "@/lib/queries/flashcards/useFlashcardDecks";
import { useQuizDecks } from "@/lib/queries/quizzes/useQuizDecks";

export function useAnalyticsChartsData(options: {
  showAnalytics: boolean;
  heatmapStart: number;
  now: number;
  tzOffsetMinutes: number;
}) {
  const { showAnalytics, heatmapStart, now, tzOffsetMinutes } = options;

  const activityParams = showAnalytics ? { start: heatmapStart, end: now, tzOffsetMinutes } : null;

  const dailyActivityRest = useDailyStudyActivity(activityParams);

  const burnoutStatsRest = useBurnoutStats(tzOffsetMinutes, showAnalytics);

  const flashcardDecksRest = useFlashcardDecks(showAnalytics);

  const quizDecksRest = useQuizDecks(showAnalytics);

  const flashcardDecks = flashcardDecksRest.data;
  const quizDecks = quizDecksRest.data;

  const primaryDeckId = flashcardDecks?.[0]?._id;
  const primaryQuizDeckId = quizDecks?.[0]?._id;

  const deckPerformanceRest = useDeckPerformance(
    showAnalytics ? primaryQuizDeckId : undefined,
  );

  const readinessForecastRest = useReadinessForecast(
    showAnalytics ? primaryDeckId : undefined,
  );

  const weakTopicsRest = useWeakTopics(showAnalytics ? primaryDeckId : undefined);

  return useMemo(
    () => ({
      dailyActivity: dailyActivityRest.data,
      burnoutStats: burnoutStatsRest.data,
      flashcardDecks,
      quizDecks,
      primaryDeckId,
      deckPerformance: deckPerformanceRest.data,
      readinessForecast: readinessForecastRest.data,
      weakTopics: weakTopicsRest.data,
    }),
    [
      dailyActivityRest.data,
      burnoutStatsRest.data,
      flashcardDecks,
      quizDecks,
      primaryDeckId,
      deckPerformanceRest.data,
      readinessForecastRest.data,
      weakTopicsRest.data,
    ],
  );
}
