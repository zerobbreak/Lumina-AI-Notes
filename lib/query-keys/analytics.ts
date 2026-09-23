export const analyticsKeys = {
  all: ["analytics"] as const,
  dailyStudyActivity: (params: { start: number; end: number; tzOffsetMinutes: number }) =>
    [...analyticsKeys.all, "daily-study-activity", params] as const,
  burnoutStats: (tzOffsetMinutes: number) =>
    [...analyticsKeys.all, "burnout-stats", { tzOffsetMinutes }] as const,
  deckPerformance: (deckId: string) =>
    [...analyticsKeys.all, "deck-performance", deckId] as const,
  readinessForecast: (deckId: string) =>
    [...analyticsKeys.all, "readiness-forecast", deckId] as const,
  weakTopics: (deckId: string) => [...analyticsKeys.all, "weak-topics", deckId] as const,
};
