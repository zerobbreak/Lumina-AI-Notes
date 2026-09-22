import { and, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { quizDecks, quizQuestions, quizResults } from "../db/schema/index.js";
import { updateStudyStreak } from "../gamification/streaks.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { assertOwnedNote, findOwnedDeck, requireOwnedDeck } from "../quizzes/helpers.js";
import { parse } from "./validation.js";

const rowId = z.string().min(1).max(200);
const title = z.string().trim().min(1).max(500);

const questionInput = z.object({
  question: z.string().trim().min(1).max(10_000),
  options: z.array(z.string().trim().min(1).max(2_000)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(10_000).optional(),
});

const createDeckBody = z.object({
  title,
  sourceNoteId: rowId.optional(),
  courseId: rowId.optional(),
  questions: z.array(questionInput).min(1).max(200),
});

const renameBody = z.object({ title });
const deleteManyBody = z.object({ deckIds: z.array(rowId).min(1).max(100) });

const saveResultBody = z.object({
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  answers: z.array(z.number().int().min(0).max(3)),
  timeSpent: z.number().finite().min(0).optional(),
  tzOffsetMinutes: z.number().int().optional(),
});

/** Port of convex/quizzes.ts */
export function createQuizzesRouter(db: Db) {
  const router = Router();

  // getDecks
  router.get("/decks", async (_req, res) => {
    const user = currentUser(res);
    const decks = await db
      .select()
      .from(quizDecks)
      .where(eq(quizDecks.userId, user.id))
      .orderBy(desc(quizDecks.createdAt));
    res.json(decks);
  });

  // createDeckWithQuestions
  router.post("/decks", async (req, res) => {
    const user = currentUser(res);
    const body = parse(createDeckBody, req.body);
    if (body.sourceNoteId) await assertOwnedNote(db, body.sourceNoteId, user.id);

    const [deck] = await db
      .insert(quizDecks)
      .values({
        userId: user.id,
        title: body.title,
        sourceNoteId: body.sourceNoteId,
        courseId: body.courseId,
        questionCount: body.questions.length,
      })
      .returning();

    await db.insert(quizQuestions).values(
      body.questions.map((q, position) => ({
        deckId: deck.id,
        position,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    );

    res.status(201).json({ id: deck.id });
  });

  // deleteMultipleDecks
  router.post("/decks/batch-delete", async (req, res) => {
    const user = currentUser(res);
    const { deckIds } = parse(deleteManyBody, req.body);
    const owned = await db
      .select({ id: quizDecks.id })
      .from(quizDecks)
      .where(and(eq(quizDecks.userId, user.id), inArray(quizDecks.id, deckIds)));

    if (owned.length > 0) {
      await db.delete(quizDecks).where(
        inArray(
          quizDecks.id,
          owned.map((d) => d.id),
        ),
      );
    }

    res.json({ deletedCount: owned.length });
  });

  // getDeck
  router.get("/decks/:deckId", async (req, res) => {
    const deck = await findOwnedDeck(db, req.params.deckId, currentUser(res).id);
    if (!deck) {
      throw new HttpError(404, "Deck not found", "not_found");
    }
    res.json(deck);
  });

  // renameDeck
  router.patch("/decks/:deckId", async (req, res) => {
    const user = currentUser(res);
    const { title: nextTitle } = parse(renameBody, req.body);
    await requireOwnedDeck(db, req.params.deckId, user.id);
    await db.update(quizDecks).set({ title: nextTitle }).where(eq(quizDecks.id, req.params.deckId));
    res.status(204).end();
  });

  // deleteDeck — questions and results cascade from the deck row.
  router.delete("/decks/:deckId", async (req, res) => {
    const user = currentUser(res);
    await requireOwnedDeck(db, req.params.deckId, user.id);
    await db.delete(quizDecks).where(eq(quizDecks.id, req.params.deckId));
    res.status(204).end();
  });

  // getQuestions
  router.get("/decks/:deckId/questions", async (req, res) => {
    const deck = await findOwnedDeck(db, req.params.deckId, currentUser(res).id);
    if (!deck) {
      res.json([]);
      return;
    }

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.deckId, deck.id))
      .orderBy(quizQuestions.position);
    res.json(questions);
  });

  // getResults
  router.get("/decks/:deckId/results", async (req, res) => {
    const user = currentUser(res);
    const results = await db
      .select()
      .from(quizResults)
      .where(and(eq(quizResults.userId, user.id), eq(quizResults.deckId, req.params.deckId)))
      .orderBy(desc(quizResults.completedAt));
    res.json(results);
  });

  // getLatestResult — before /results would conflict; use dedicated path.
  router.get("/decks/:deckId/results/latest", async (req, res) => {
    const user = currentUser(res);
    const [result] = await db
      .select()
      .from(quizResults)
      .where(and(eq(quizResults.userId, user.id), eq(quizResults.deckId, req.params.deckId)))
      .orderBy(desc(quizResults.completedAt))
      .limit(1);
    res.json(result ?? null);
  });

  // saveResult
  router.post("/decks/:deckId/results", async (req, res) => {
    const user = currentUser(res);
    const body = parse(saveResultBody, req.body);
    await requireOwnedDeck(db, req.params.deckId, user.id);

    const [result] = await db
      .insert(quizResults)
      .values({
        deckId: req.params.deckId,
        userId: user.id,
        score: body.score,
        totalQuestions: body.totalQuestions,
        answers: body.answers,
        timeSpent: body.timeSpent,
      })
      .returning({ id: quizResults.id });

    await db
      .update(quizDecks)
      .set({ lastTakenAt: new Date() })
      .where(eq(quizDecks.id, req.params.deckId));

    if (body.tzOffsetMinutes !== undefined) {
      await updateStudyStreak(db, user.id, { tzOffsetMinutes: body.tzOffsetMinutes });
    }

    res.status(201).json({ id: result.id });
  });

  return router;
}
