import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { ClerkProfiles } from "../auth/clerk-profiles.js";
import type { Db } from "../db/client.js";
import {
  aiDailyUsage,
  chatMessages,
  chatSessions,
  deadlines,
  documents,
  files,
  flashcardDecks,
  flashcards,
  notes,
  noteTags,
  quizDecks,
  quizQuestions,
  quizResults,
  recordings,
  tags,
  users,
} from "../db/schema/index.js";
import { MAX_AI_CALLS_PER_DAY } from "../middleware/ai-rate-limit.js";
import { currentUser } from "../middleware/user.js";
import { AUDIO_LIMIT_MINUTES, getUserUsage } from "../recordings/usage.js";
import type { Storage } from "../storage/s3.js";
import { parse } from "./validation.js";

/** Bumped whenever the export's shape changes, so importers can tell versions apart. */
export const EXPORT_VERSION = 1;

/** Typed by the user in the UI; the API insists on it so a stray request can't wipe an account. */
export const DELETE_CONFIRMATION = "DELETE";

const deleteBody = z.object({ confirm: z.literal(DELETE_CONFIRMATION) });

/** Drops search vectors, embeddings, bucket keys and owner ids: internal, or useless outside the app. */
function strip<T extends Record<string, unknown>>(row: T) {
  const {
    userId: _userId,
    embedding: _embedding,
    searchTitle: _searchTitle,
    searchContent: _searchContent,
    searchName: _searchName,
    storageKey: _storageKey,
    audioStorageKey: _audioStorageKey,
    ...rest
  } = row;
  return rest;
}

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Start of the next calendar month in server time, which is when normalizeUsage resets. */
const nextMonthStart = (now: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
};

/** Usage, data export and account deletion for the Settings dialog. */
export function createAccountRouter(db: Db, storage: Storage, clerkProfiles: ClerkProfiles) {
  const router = Router();

  router.get("/me/usage", async (_req, res) => {
    const user = currentUser(res);
    const now = Date.now();
    const usage = await getUserUsage(db, user.id, now);
    const [today] = await db
      .select({ count: aiDailyUsage.count })
      .from(aiDailyUsage)
      .where(and(eq(aiDailyUsage.userId, user.id), eq(aiDailyUsage.day, utcDay(now))));
    res.json({
      audio: {
        usedMinutes: usage.audioMinutesUsed,
        limitMinutes: AUDIO_LIMIT_MINUTES,
        resetsAt: nextMonthStart(now),
      },
      ai: { usedToday: today?.count ?? 0, dailyLimit: MAX_AI_CALLS_PER_DAY },
    });
  });

  // Everything the user owns, as one JSON file. Uploaded files and audio are
  // listed but not bundled: they can be downloaded from the app one by one.
  router.get("/me/export", async (_req, res) => {
    const user = currentUser(res);
    const uid = user.id;
    const ownedDecks = db.select({ id: flashcardDecks.id }).from(flashcardDecks).where(eq(flashcardDecks.userId, uid));
    const ownedQuizzes = db.select({ id: quizDecks.id }).from(quizDecks).where(eq(quizDecks.userId, uid));
    const ownedChats = db.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.userId, uid));
    const ownedNotes = db.select({ id: notes.id }).from(notes).where(eq(notes.userId, uid));

    const [
      noteRows,
      tagRows,
      noteTagRows,
      deckRows,
      cardRows,
      quizRows,
      questionRows,
      resultRows,
      deadlineRows,
      chatRows,
      messageRows,
      recordingRows,
      fileRows,
    ] = await Promise.all([
      db.select().from(notes).where(eq(notes.userId, uid)),
      db.select().from(tags).where(eq(tags.userId, uid)),
      db.select().from(noteTags).where(inArray(noteTags.noteId, ownedNotes)),
      db.select().from(flashcardDecks).where(eq(flashcardDecks.userId, uid)),
      db.select().from(flashcards).where(inArray(flashcards.deckId, ownedDecks)),
      db.select().from(quizDecks).where(eq(quizDecks.userId, uid)),
      db.select().from(quizQuestions).where(inArray(quizQuestions.deckId, ownedQuizzes)),
      db.select().from(quizResults).where(eq(quizResults.userId, uid)),
      db.select().from(deadlines).where(eq(deadlines.userId, uid)),
      db.select().from(chatSessions).where(eq(chatSessions.userId, uid)),
      db.select().from(chatMessages).where(inArray(chatMessages.sessionId, ownedChats)),
      db.select().from(recordings).where(eq(recordings.userId, uid)),
      db.select().from(files).where(eq(files.userId, uid)),
    ]);

    const exported = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile: {
        email: user.email,
        name: user.name,
        major: user.major,
        semester: user.semester,
        courses: user.courses ?? [],
        noteStyle: user.noteStyle,
        dailyGoalMinutes: user.dailyGoalMinutes,
        dailyGoalCards: user.dailyGoalCards,
        badges: user.badges ?? [],
        createdAt: user.createdAt,
      },
      notes: noteRows.map(strip),
      tags: tagRows.map(strip),
      noteTags: noteTagRows,
      flashcardDecks: deckRows.map((deck) => ({
        ...strip(deck),
        cards: cardRows.filter((c) => c.deckId === deck.id).map(strip),
      })),
      quizzes: quizRows.map((quiz) => ({
        ...strip(quiz),
        questions: questionRows.filter((q) => q.deckId === quiz.id),
        results: resultRows.filter((r) => r.deckId === quiz.id).map(strip),
      })),
      deadlines: deadlineRows.map(strip),
      chats: chatRows.map((chat) => ({
        ...strip(chat),
        messages: messageRows.filter((m) => m.sessionId === chat.id),
      })),
      recordings: recordingRows.map(strip),
      files: fileRows.map(strip),
    };

    res.setHeader("Content-Disposition", `attachment; filename="lumina-export-${utcDay(Date.now())}.json"`);
    res.json(exported);
  });

  // Deletes the account for good: every row (by cascade), the bucket objects
  // and the Clerk user. The Clerk call runs inside the transaction, so if it
  // fails nothing is deleted and the user can try again.
  router.delete("/me", async (req, res) => {
    parse(deleteBody, req.body);
    const user = currentUser(res);

    const keys = await db.transaction(async (tx) => {
      const fileKeys = await tx
        .select({ key: files.storageKey })
        .from(files)
        .where(and(eq(files.userId, user.id), isNotNull(files.storageKey)));
      const audioKeys = await tx
        .select({ key: recordings.audioStorageKey })
        .from(recordings)
        .where(and(eq(recordings.userId, user.id), isNotNull(recordings.audioStorageKey)));
      const keys = [...fileKeys, ...audioKeys].map((r) => r.key!);

      // Document chunks hang off bucket keys rather than the user, so no cascade reaches them.
      if (fileKeys.length > 0) {
        await tx.delete(documents).where(
          inArray(
            documents.storageKey,
            fileKeys.map((r) => r.key!),
          ),
        );
      }
      await tx.delete(users).where(eq(users.id, user.id));
      await clerkProfiles.delete(user.clerkUserId);
      return keys;
    });

    // The rows are gone either way; a failed delete only leaves an orphan object.
    await Promise.all(
      keys.map((key) =>
        storage.delete(key).catch((err) => {
          console.error(`Failed to delete ${key} from storage:`, err);
        }),
      ),
    );
    res.status(204).end();
  });

  return router;
}
