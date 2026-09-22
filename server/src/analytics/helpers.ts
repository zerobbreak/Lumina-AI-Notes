const DAY_MS = 24 * 60 * 60 * 1000;

export const DAY_IN_MS = DAY_MS;

export const getLocalDayStart = (timestamp: number, tzOffsetMinutes: number) => {
  const offsetMs = tzOffsetMinutes * 60 * 1000;
  return Math.floor((timestamp + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
};

export const computePredictedReadyDate = (
  cardsRemaining: number,
  avgDailyReviews: number,
  now: number = Date.now(),
) => {
  if (avgDailyReviews <= 0) return null;
  const daysNeeded = Math.ceil(cardsRemaining / avgDailyReviews);
  return now + daysNeeded * DAY_MS;
};
