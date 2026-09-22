import type { Db } from "../db/client.js";
import { flashcardDecks, flashcards } from "../db/schema/index.js";
import { DEFAULT_EASE_FACTOR } from "./spacedRepetition.js";

export async function createDeckWithCards(
  db: Db,
  userId: string,
  args: {
    title: string;
    sourceNoteId?: string;
    courseId?: string;
    cards: Array<{ front: string; back: string }>;
  },
) {
  const now = new Date();
  const [deck] = await db
    .insert(flashcardDecks)
    .values({
      userId,
      title: args.title,
      sourceNoteId: args.sourceNoteId,
      courseId: args.courseId,
      cardCount: args.cards.length,
    })
    .returning();

  if (args.cards.length > 0) {
    await db.insert(flashcards).values(
      args.cards.map((card, position) => ({
        userId,
        deckId: deck.id,
        front: card.front,
        back: card.back,
        position,
        reviewCount: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReviewAt: now,
      })),
    );
  }
  return deck.id;
}

/** Cards are due immediately (port of createDeckWithCardsImmediate). */
export async function createDeckWithCardsImmediate(
  db: Db,
  userId: string,
  args: {
    title: string;
    sourceFileName?: string;
    courseId?: string;
    cards: Array<{ front: string; back: string }>;
  },
) {
  return createDeckWithCards(db, userId, {
    title: args.title,
    courseId: args.courseId,
    cards: args.cards,
  });
}
