import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type {
  BurnoutStats,
  DailyStudyActivityPoint,
  DeckPerformancePoint,
  ReadinessForecast,
  WeakTopic,
} from "@/types/api/analytics";


export const analyticsApi = {
  getDailyStudyActivity(
    token: string,
    params: { start: number; end: number; tzOffsetMinutes: number },
  ) {
    return apiFetch<DailyStudyActivityPoint[]>(
      apiPath`/analytics/daily-study-activity`,
      { query: params, token },
    );
  },

  getBurnoutStats(token: string, tzOffsetMinutes: number) {
    return apiFetch<BurnoutStats>(
      apiPath`/analytics/burnout-stats`,
      { query: { tzOffsetMinutes }, token },
    );
  },

  getDeckPerformance(token: string, deckId: string) {
    return apiFetch<DeckPerformancePoint[]>(
      apiPath`/analytics/quiz-decks/${deckId}/performance`,
      { token },
    );
  },

  getReadinessForecast(token: string, deckId: string) {
    return apiFetch<ReadinessForecast>(
      apiPath`/analytics/flashcard-decks/${deckId}/readiness-forecast`,
      { token },
    );
  },

  getWeakTopics(token: string, deckId: string) {
    return apiFetch<WeakTopic[]>(
      apiPath`/analytics/flashcard-decks/${deckId}/weak-topics`,
      { token },
    );
  },
};
