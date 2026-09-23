/** Response from `GET /users/me/usage`. */
export type UsageDto = {
  audio: {
    usedMinutes: number;
    limitMinutes: number;
    /** ms timestamp */
    resetsAt: number;
  };
  ai: { usedToday: number; dailyLimit: number };
};

export type SetDailyGoalsInput = { minutes: number; cards: number };

/** The word the user types to confirm; the API checks it too. */
export const DELETE_ACCOUNT_CONFIRMATION = "DELETE";
