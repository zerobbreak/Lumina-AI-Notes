import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { flashcardDecks, flashcards } from "../../db/schema/index.js";
import { DEFAULT_EASE_FACTOR } from "../../flashcards/spacedRepetition.js";

/** Port of convex/flashcards.initializeSrsFieldsInternal */
export async function initializeSrsFields(db: Db, limit = 200) {
  const cards = await db.select().from(flashcards).limit(limit * 3);

  let updated = 0;
  for (const card of cards) {
    if (updated >= limit) break;

    const needsUserId = !card.userId;
    const needsEase = card.easeFactor == null;
    const needsReps = card.repetitions == null;
    if (!needsUserId && !needsEase && !needsReps) continue;

    const [deck] = await db
      .select({ userId: flashcardDecks.userId })
      .from(flashcardDecks)
      .where(eq(flashcardDecks.id, card.deckId))
      .limit(1);
    if (!deck) continue;

    const repetitions = card.repetitions ?? card.reviewCount ?? 0;
    await db
      .update(flashcards)
      .set({
        userId: deck.userId,
        nextReviewAt: card.nextReviewAt ?? new Date(),
        easeFactor: card.easeFactor ?? card.difficulty ?? DEFAULT_EASE_FACTOR,
        repetitions,
        interval: card.interval ?? (repetitions > 0 && card.nextReviewAt ? 1 : 0),
      })
      .where(eq(flashcards.id, card.id));
    updated += 1;
  }

  return { updated };
}
