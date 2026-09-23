export type DailyStudyActivityPoint = {
  date: number;
  count: number;
};

export type BurnoutStats = {
  streakDays: number;
  level: "low" | "medium" | "high";
};

export type DeckPerformancePoint = {
  date: number;
  scorePercent: number;
};

export type ReadinessForecast = {
  predictedReadyDate: number | null;
  cardsRemaining: number;
  examDate?: number;
};

export type WeakTopic = {
  cardId: string;
  topic: string;
  easeFactor: number;
};
