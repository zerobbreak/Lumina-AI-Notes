import { apiFetch } from "@/lib/api/client";
import type {
  BurnoutStats,
  DailyStudyActivityPoint,
  DeckPerformancePoint,
  ReadinessForecast,
  WeakTopic,
} from "@/types/api/analytics";

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const analyticsApi = {
  getDailyStudyActivity(
    token: string,
    params: { start: number; end: number; tzOffsetMinutes: number },
  ) {
    return apiFetch<DailyStudyActivityPoint[]>(
      `/analytics/daily-study-activity${qs(params)}`,
      { token },
    );
  },

  getBurnoutStats(token: string, tzOffsetMinutes: number) {
    return apiFetch<BurnoutStats>(
      `/analytics/burnout-stats${qs({ tzOffsetMinutes })}`,
      { token },
    );
  },

  getDeckPerformance(token: string, deckId: string) {
    return apiFetch<DeckPerformancePoint[]>(
      `/analytics/quiz-decks/${encodeURIComponent(deckId)}/performance`,
      { token },
    );
  },

  getReadinessForecast(token: string, deckId: string) {
    return apiFetch<ReadinessForecast>(
      `/analytics/flashcard-decks/${encodeURIComponent(deckId)}/readiness-forecast`,
      { token },
    );
  },

  getWeakTopics(token: string, deckId: string) {
    return apiFetch<WeakTopic[]>(
      `/analytics/flashcard-decks/${encodeURIComponent(deckId)}/weak-topics`,
      { token },
    );
  },
};
