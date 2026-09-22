import { and, eq, lte } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { flashcardReviewQueues, flashcards, users } from "../../db/schema/index.js";
import { getEndOfDay, getStartOfDay } from "../../flashcards/helpers.js";

/** Port of convex/flashcards.buildDailyQueuesInternal */
export async function buildDailyQueues(db: Db) {
  const allUsers = await db.select({ id: users.id }).from(users);
  const todayStart = getStartOfDay(new Date());
  const todayEnd = getEndOfDay(new Date());
  const now = new Date();

  for (const user of allUsers) {
    const dueCards = await db
      .select({ id: flashcards.id })
      .from(flashcards)
      .where(and(eq(flashcards.userId, user.id), lte(flashcards.nextReviewAt, todayEnd)));

    const cardIds = dueCards.map((c) => c.id);

    const [existing] = await db
      .select()
      .from(flashcardReviewQueues)
      .where(and(eq(flashcardReviewQueues.userId, user.id), eq(flashcardReviewQueues.date, todayStart)))
      .limit(1);

    if (existing) {
      await db
        .update(flashcardReviewQueues)
        .set({ cardIds, updatedAt: now })
        .where(eq(flashcardReviewQueues.id, existing.id));
    } else {
      await db.insert(flashcardReviewQueues).values({
        userId: user.id,
        date: todayStart,
        cardIds,
        updatedAt: now,
      });
    }
  }

  return { processedUsers: allUsers.length };
}
