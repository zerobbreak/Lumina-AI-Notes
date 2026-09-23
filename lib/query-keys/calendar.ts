export const calendarKeys = {
  all: ["calendar"] as const,
  activity: (range: { startMs: number; endMs: number }) =>
    [...calendarKeys.all, "activity", range] as const,
};
