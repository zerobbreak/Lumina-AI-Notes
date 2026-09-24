import { and, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import {
  deadlines,
  flashcardDecks,
  flashcardReviewEvents,
  flashcards,
  notes,
  quizDecks,
  quizResults,
  recordings,
} from "../db/schema/index.js";
import { buildHomeSummary, RUNWAY_DAYS, STREAK_DAYS, TREND_WEEKS, type HomeResume } from "../home/summary.js";
import { currentUser } from "../middleware/user.js";
import { toPreview } from "./note-lists.js";
import { parse, tzOffsetMinutes } from "./validation.js";

const DAY = 24 * 60 * 60 * 1000;
/** A note last opened longer ago than this isn't offered as "pick up where you left off". */
const RESUME_WINDOW = 14 * DAY;

const homeQuery = z.object({
  /** `Date#getTimezoneOffset()`: minutes to add to local time to get UTC. */
  tzOffsetMinutes: z.coerce.number().pipe(tzOffsetMinutes).default(0),
});

/** Last millisecond of the user's local day, as a UTC timestamp. */
export function localDayEnd(now: number, offsetMinutes: number) {
  const offset = offsetMinutes * 60_000;
  return Math.floor((now - offset) / DAY) * DAY + DAY - 1 + offset;
}

export function createHomeRouter(db: Db) {
  const router = Router();

  router.get("/", async (req, res) => {
    const user = currentUser(res);
    const { tzOffsetMinutes: offset } = parse(homeQuery, req.query);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const dayEnd = localDayEnd(now, offset);
    const dayEndIso = new Date(dayEnd).toISOString();

    const streakStart = new Date(dayEnd + 1 - STREAK_DAYS * DAY);
    const [
      deadlineRows, cardStats, quizDeckRows, latestResults, reviewRows, noteStats, [lastNote], quizTimes, recordingTimes,
    ] = await Promise.all([
      db
        .select()
        .from(deadlines)
        .where(
          and(
            eq(deadlines.userId, user.id),
            isNull(deadlines.completedAt),
            gte(deadlines.dueAt, new Date(now - RUNWAY_DAYS * DAY)),
            lte(deadlines.dueAt, new Date(now + RUNWAY_DAYS * DAY)),
          ),
        ),
      db
        .select({
          deckId: flashcardDecks.id,
          courseId: flashcardDecks.courseId,
          lastStudiedAt: flashcardDecks.lastStudiedAt,
          total: sql<number>`count(${flashcards.id})::int`,
          mastered: sql<number>`(count(*) filter (where ${flashcards.repetitions} >= 2 and ${flashcards.nextReviewAt} > ${nowIso}::timestamptz))::int`,
          dueToday: sql<number>`(count(*) filter (where ${flashcards.nextReviewAt} <= ${dayEndIso}::timestamptz))::int`,
        })
        .from(flashcardDecks)
        .leftJoin(flashcards, eq(flashcards.deckId, flashcardDecks.id))
        .where(eq(flashcardDecks.userId, user.id))
        .groupBy(flashcardDecks.id),
      db
        .select({
          id: quizDecks.id,
          title: quizDecks.title,
          courseId: quizDecks.courseId,
          questionCount: quizDecks.questionCount,
          lastTakenAt: quizDecks.lastTakenAt,
        })
        .from(quizDecks)
        .where(eq(quizDecks.userId, user.id)),
      db
        .selectDistinctOn([quizResults.deckId], {
          deckId: quizResults.deckId,
          score: quizResults.score,
          totalQuestions: quizResults.totalQuestions,
          completedAt: quizResults.completedAt,
        })
        .from(quizResults)
        .where(eq(quizResults.userId, user.id))
        .orderBy(quizResults.deckId, desc(quizResults.completedAt)),
      db
        .select({
          deckId: flashcardReviewEvents.deckId,
          rating: flashcardReviewEvents.rating,
          reviewedAt: flashcardReviewEvents.reviewedAt,
        })
        .from(flashcardReviewEvents)
        .where(
          and(
            eq(flashcardReviewEvents.userId, user.id),
            gte(flashcardReviewEvents.reviewedAt, new Date(now - TREND_WEEKS * 7 * DAY)),
          ),
        ),
      db
        .select({
          courseId: sql<string>`${notes.courseId}`,
          count: sql<number>`count(*)::int`,
          lastUpdatedAt: sql<Date | null>`max(${notes.updatedAt})`,
        })
        .from(notes)
        .where(and(eq(notes.userId, user.id), eq(notes.isArchived, false), isNotNull(notes.courseId)))
        .groupBy(notes.courseId),
      db
        .select({
          id: notes.id,
          title: notes.title,
          courseId: notes.courseId,
          moduleId: notes.moduleId,
          lastAccessedAt: notes.lastAccessedAt,
          contentHead: sql<string | null>`left(${notes.content}, 4000)`,
        })
        .from(notes)
        .where(
          and(
            eq(notes.userId, user.id),
            eq(notes.isArchived, false),
            gte(notes.lastAccessedAt, new Date(now - RESUME_WINDOW)),
          ),
        )
        .orderBy(desc(notes.lastAccessedAt))
        .limit(1),
      db
        .select({ at: quizResults.completedAt })
        .from(quizResults)
        .where(and(eq(quizResults.userId, user.id), gte(quizResults.completedAt, streakStart))),
      db
        .select({ at: recordings.createdAt })
        .from(recordings)
        .where(and(eq(recordings.userId, user.id), gte(recordings.createdAt, streakStart))),
    ]);

    const time = (d: Date | string | null) => (d ? new Date(d).getTime() : null);

    const summary = buildHomeSummary({
        now,
        dayEnd,
        courses: user.courses ?? [],
        deadlines: deadlineRows.map((d) => ({
          id: d.id,
          title: d.title,
          dueAt: d.dueAt.getTime(),
          kind: d.kind,
          courseId: d.courseId,
          source: d.source,
          externalUrl: d.externalUrl,
        })),
        cardStats: cardStats.map((s) => ({ ...s, lastStudiedAt: time(s.lastStudiedAt) })),
        quizDecks: quizDeckRows.map((q) => ({ ...q, lastTakenAt: time(q.lastTakenAt) })),
        latestQuizResults: latestResults.map((r) => ({ ...r, completedAt: r.completedAt.getTime() })),
        reviews: reviewRows.map((r) => ({ ...r, reviewedAt: r.reviewedAt.getTime() })),
        // max() comes back as a string from the driver, not a Date.
        noteStats: noteStats.map((n) => ({ ...n, lastUpdatedAt: time(n.lastUpdatedAt) })),
        activity: [...quizTimes, ...recordingTimes].map((r) => r.at.getTime()),
    });

    const resume: HomeResume | null = lastNote
      ? {
          noteId: lastNote.id,
          title: lastNote.title,
          preview: toPreview(lastNote.contentHead),
          courseId: lastNote.courseId ?? undefined,
          moduleId: lastNote.moduleId ?? undefined,
          lastAccessedAt: lastNote.lastAccessedAt!.getTime(),
        }
      : null;

    res.json({ ...summary, resume });
  });

  return router;
}
