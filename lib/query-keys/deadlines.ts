export const deadlineKeys = {
  all: ["deadlines"] as const,
  upcoming: (params?: { limit?: number; windowDays?: number; includeCompleted?: boolean }) =>
    [...deadlineKeys.all, "upcoming", params ?? {}] as const,
  range: (params: { startMs: number; endMs: number }) =>
    [...deadlineKeys.all, "range", params] as const,
  overdue: (params?: { limit?: number; windowDays?: number }) =>
    [...deadlineKeys.all, "overdue", params ?? {}] as const,
};
