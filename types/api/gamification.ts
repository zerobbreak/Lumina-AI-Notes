/** Response from `GET /users/me/gamification`. */
export type GamificationStatsDto = {
  currentStreak: number;
  longestStreak: number;
  lastStudiedDate?: number;
  badges: string[];
  dailyGoalMinutes: number;
  dailyGoalCards: number;
};
