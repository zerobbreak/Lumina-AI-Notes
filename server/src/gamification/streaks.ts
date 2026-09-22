import { eq } from "drizzle-orm";
import { getLocalDayStart } from "../analytics/helpers.js";
import type { Db } from "../db/client.js";
import { users } from "../db/schema/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Port of convex/users.updateStudyStreak */
export async function updateStudyStreak(
  db: Db,
  userId: string,
  args: { timestamp?: number; tzOffsetMinutes: number },
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const now = args.timestamp ?? Date.now();
  const todayStart = getLocalDayStart(now, args.tzOffsetMinutes);
  const yesterdayStart = todayStart - DAY_MS;

  const lastStudiedMs = user.lastStudiedDate?.getTime();
  let currentStreak = user.currentStreak ?? 0;

  if (lastStudiedMs === todayStart) {
    return {
      currentStreak,
      longestStreak: user.longestStreak ?? currentStreak,
    };
  }

  if (lastStudiedMs === yesterdayStart) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }

  const longestStreak = Math.max(user.longestStreak ?? 0, currentStreak);

  await db
    .update(users)
    .set({
      currentStreak,
      longestStreak,
      lastStudiedDate: new Date(todayStart),
      lastTimezoneOffsetMinutes: args.tzOffsetMinutes,
    })
    .where(eq(users.id, userId));

  return { currentStreak, longestStreak };
}

/** Port of convex/users.resetStreaksInternal */
export async function resetStreaks(db: Db) {
  const allUsers = await db.select().from(users);
  const now = Date.now();
  let resetCount = 0;

  for (const user of allUsers) {
    if (!user.lastStudiedDate) continue;

    const tzOffset = user.lastTimezoneOffsetMinutes ?? 0;
    const todayStart = getLocalDayStart(now, tzOffset);
    const yesterdayStart = todayStart - DAY_MS;
    const lastStudiedMs = user.lastStudiedDate.getTime();

    if ((user.currentStreak ?? 0) > 0 && lastStudiedMs < yesterdayStart) {
      await db.update(users).set({ currentStreak: 0 }).where(eq(users.id, user.id));
      resetCount += 1;
    }
  }

  return { resetCount };
}
