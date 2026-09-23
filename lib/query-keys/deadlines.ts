export const deadlineKeys = {
  all: ["deadlines"] as const,
  upcoming: (params?: { limit?: number; windowDays?: number; includeCompleted?: boolean }) =>
    [...deadlineKeys.all, "upcoming", params ?? {}] as const,
};
