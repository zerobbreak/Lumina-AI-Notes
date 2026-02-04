const DAY_MS = 24 * 60 * 60 * 1000;

export const getLocalDayStart = (timestamp: number, tzOffsetMinutes: number) => {
  const offsetMs = tzOffsetMinutes * 60 * 1000;
  const local = new Date(timestamp + offsetMs);
  local.setHours(0, 0, 0, 0);
  return local.getTime() - offsetMs;
};

export const countByLocalDay = (
  timestamps: number[],
  tzOffsetMinutes: number,
) => {
  const counts = new Map<number, number>();
  timestamps.forEach((ts) => {
    const dayStart = getLocalDayStart(ts, tzOffsetMinutes);
    counts.set(dayStart, (counts.get(dayStart) ?? 0) + 1);
  });
  return counts;
};

export const calculateStreakDays = (
  days: Set<number>,
  todayStart: number,
) => {
  let streakDays = 0;
  let cursor = todayStart;
  while (days.has(cursor)) {
    streakDays += 1;
    cursor -= DAY_MS;
  }
  return streakDays;
};

export const DAY_IN_MS = DAY_MS;

export const computePredictedReadyDate = (
  cardsRemaining: number,
  avgDailyReviews: number,
  now: number = Date.now(),
) => {
  if (avgDailyReviews <= 0) return null;
  const daysNeeded = Math.ceil(cardsRemaining / avgDailyReviews);
  return now + daysNeeded * DAY_MS;
};
