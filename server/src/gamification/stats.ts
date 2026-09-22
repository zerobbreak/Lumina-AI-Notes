import type { User } from "../middleware/user.js";

/** Port of convex/users.getUserGamificationStats response shape. */
export function toGamificationStats(user: User) {
  return {
    currentStreak: user.currentStreak ?? 0,
    longestStreak: user.longestStreak ?? 0,
    lastStudiedDate: user.lastStudiedDate?.getTime(),
    badges: user.badges ?? [],
    dailyGoalMinutes: user.dailyGoalMinutes ?? 30,
    dailyGoalCards: user.dailyGoalCards ?? 20,
  };
}
