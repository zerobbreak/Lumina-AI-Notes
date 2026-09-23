"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
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
  const useRest = isRestApiEnabled();

  const activityParams = showAnalytics ? { start: heatmapStart, end: now, tzOffsetMinutes } : null;

  const dailyActivityConvex = useQuery(
    api.analytics.getDailyStudyActivity,
    !useRest && activityParams ? activityParams : "skip",
  );
  const dailyActivityRest = useDailyStudyActivity(useRest ? activityParams : null);

  const burnoutStatsConvex = useQuery(
    api.analytics.getBurnoutStats,
    !useRest && showAnalytics ? { tzOffsetMinutes } : "skip",
  );
  const burnoutStatsRest = useBurnoutStats(tzOffsetMinutes, useRest && showAnalytics);

  const flashcardDecksConvex = useQuery(
    api.flashcards.getDecks,
    !useRest && showAnalytics ? {} : "skip",
  );
  const flashcardDecksRest = useFlashcardDecks(useRest && showAnalytics);

  const quizDecksConvex = useQuery(api.quizzes.getDecks, !useRest && showAnalytics ? {} : "skip");
  const quizDecksRest = useQuizDecks(useRest && showAnalytics);

  const flashcardDecks = useRest ? flashcardDecksRest.data : flashcardDecksConvex;
  const quizDecks = useRest ? quizDecksRest.data : quizDecksConvex;

  const primaryDeckId = flashcardDecks?.[0]?._id;
  const primaryQuizDeckId = quizDecks?.[0]?._id;

  const deckPerformanceConvex = useQuery(
    api.analytics.getDeckPerformance,
    !useRest && showAnalytics && primaryQuizDeckId
      ? { deckId: primaryQuizDeckId as Id<"quizDecks"> }
      : "skip",
  );
  const deckPerformanceRest = useDeckPerformance(
    useRest && showAnalytics ? primaryQuizDeckId : undefined,
  );

  const readinessForecastConvex = useQuery(
    api.analytics.getReadinessForecast,
    !useRest && showAnalytics && primaryDeckId
      ? { deckId: primaryDeckId as Id<"flashcardDecks"> }
      : "skip",
  );
  const readinessForecastRest = useReadinessForecast(
    useRest && showAnalytics ? primaryDeckId : undefined,
  );

  const weakTopicsConvex = useQuery(
    api.analytics.getWeakTopics,
    !useRest && showAnalytics && primaryDeckId
      ? { deckId: primaryDeckId as Id<"flashcardDecks"> }
      : "skip",
  );
  const weakTopicsRest = useWeakTopics(useRest && showAnalytics ? primaryDeckId : undefined);

  return useMemo(
    () => ({
      dailyActivity: useRest ? dailyActivityRest.data : dailyActivityConvex,
      burnoutStats: useRest ? burnoutStatsRest.data : burnoutStatsConvex,
      flashcardDecks,
      quizDecks,
      primaryDeckId,
      deckPerformance: useRest ? deckPerformanceRest.data : deckPerformanceConvex,
      readinessForecast: useRest ? readinessForecastRest.data : readinessForecastConvex,
      weakTopics: useRest ? weakTopicsRest.data : weakTopicsConvex,
    }),
    [
      useRest,
      dailyActivityRest.data,
      dailyActivityConvex,
      burnoutStatsRest.data,
      burnoutStatsConvex,
      flashcardDecks,
      quizDecks,
      primaryDeckId,
      deckPerformanceRest.data,
      deckPerformanceConvex,
      readinessForecastRest.data,
      readinessForecastConvex,
      weakTopicsRest.data,
      weakTopicsConvex,
    ],
  );
}
