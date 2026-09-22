import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { flashcardDecks, flashcards, notes } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";

export const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export async function findOwnedDeck(db: Db, deckId: string, userId: string) {
  const [deck] = await db
    .select()
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, userId)))
    .limit(1);
  return deck ?? null;
}

export async function requireOwnedDeck(db: Db, deckId: string, userId: string) {
  const deck = await findOwnedDeck(db, deckId, userId);
  if (!deck) {
    throw new HttpError(404, "Deck not found or access denied", "not_found");
  }
  return deck;
}

export async function findOwnedCard(db: Db, cardId: string, userId: string) {
  const [row] = await db
    .select({ card: flashcards, deck: flashcardDecks })
    .from(flashcards)
    .innerJoin(flashcardDecks, eq(flashcards.deckId, flashcardDecks.id))
    .where(and(eq(flashcards.id, cardId), eq(flashcardDecks.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function requireOwnedCard(db: Db, cardId: string, userId: string) {
  const row = await findOwnedCard(db, cardId, userId);
  if (!row) {
    throw new HttpError(404, "Card not found or unauthorized", "not_found");
  }
  return row;
}

export async function assertOwnedNote(db: Db, noteId: string, userId: string) {
  const [note] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);
  if (!note) {
    throw new HttpError(400, "Unknown note", "invalid_request");
  }
}
