import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { notes, quizDecks } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";

export async function findOwnedDeck(db: Db, deckId: string, userId: string) {
  const [deck] = await db
    .select()
    .from(quizDecks)
    .where(and(eq(quizDecks.id, deckId), eq(quizDecks.userId, userId)))
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
