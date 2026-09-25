import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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
import { STREAK_DAYS, TREND_WEEKS, type HomeInput } from "./summary.js";

const DAY = 24 * 60 * 60 * 1000;

export type StudyInput = Omit<HomeInput, "courses" | "cardStats"> & {
  cardStats: Array<HomeInput["cardStats"][number] & { title: string }>;
};

/**
 * Gathers the study data that home and the course page score. With `courseId`
 * only that course's decks, quizzes, notes and deadlines load, and the study
 * strip's activity is skipped (the course page doesn't show one).
 */
export async function loadStudyInput(
  db: Db,
  userId: string,
  opts: { now: number; dayEnd: number; deadlinesFrom: number; deadlinesTo: number; courseId?: string },
): Promise<StudyInput> {
  const { now, dayEnd, courseId } = opts;
  const nowIso = new Date(now).toISOString();
  const dayEndIso = new Date(dayEnd).toISOString();
  const streakStart = new Date(dayEnd + 1 - STREAK_DAYS * DAY);
  const inCourse = (column: AnyPgColumn, clause: SQL | undefined) =>
    courseId ? and(clause, eq(column, courseId)) : clause;

  const [deadlineRows, cardStats, quizDeckRows, latestResults, reviewRows, noteStats, quizTimes, recordingTimes] =
    await Promise.all([
      db
        .select()
        .from(deadlines)
        .where(
          inCourse(
            deadlines.courseId,
            and(
              eq(deadlines.userId, userId),
              isNull(deadlines.completedAt),
              gte(deadlines.dueAt, new Date(opts.deadlinesFrom)),
              lte(deadlines.dueAt, new Date(opts.deadlinesTo)),
            ),
          ),
        ),
      db
        .select({
          deckId: flashcardDecks.id,
          title: flashcardDecks.title,
          courseId: flashcardDecks.courseId,
          lastStudiedAt: flashcardDecks.lastStudiedAt,
          total: sql<number>`count(${flashcards.id})::int`,
          mastered: sql<number>`(count(*) filter (where ${flashcards.repetitions} >= 2 and ${flashcards.nextReviewAt} > ${nowIso}::timestamptz))::int`,
          dueToday: sql<number>`(count(*) filter (where ${flashcards.nextReviewAt} <= ${dayEndIso}::timestamptz))::int`,
        })
        .from(flashcardDecks)
        .leftJoin(flashcards, eq(flashcards.deckId, flashcardDecks.id))
        .where(inCourse(flashcardDecks.courseId, eq(flashcardDecks.userId, userId)))
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
        .where(inCourse(quizDecks.courseId, eq(quizDecks.userId, userId))),
      db
        .selectDistinctOn([quizResults.deckId], {
          deckId: quizResults.deckId,
          score: quizResults.score,
          totalQuestions: quizResults.totalQuestions,
          completedAt: quizResults.completedAt,
        })
        .from(quizResults)
        .where(
          and(
            eq(quizResults.userId, userId),
            courseId
              ? inArray(
                  quizResults.deckId,
                  db
                    .select({ id: quizDecks.id })
                    .from(quizDecks)
                    .where(and(eq(quizDecks.userId, userId), eq(quizDecks.courseId, courseId))),
                )
              : undefined,
          ),
        )
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
            eq(flashcardReviewEvents.userId, userId),
            gte(flashcardReviewEvents.reviewedAt, new Date(now - TREND_WEEKS * 7 * DAY)),
            courseId
              ? inArray(
                  flashcardReviewEvents.deckId,
                  db
                    .select({ id: flashcardDecks.id })
                    .from(flashcardDecks)
                    .where(and(eq(flashcardDecks.userId, userId), eq(flashcardDecks.courseId, courseId))),
                )
              : undefined,
          ),
        ),
      db
        .select({
          courseId: sql<string>`${notes.courseId}`,
          count: sql<number>`count(*)::int`,
          lastUpdatedAt: sql<Date | null>`max(${notes.updatedAt})`,
        })
        .from(notes)
        .where(
          inCourse(
            notes.courseId,
            and(eq(notes.userId, userId), eq(notes.isArchived, false), isNotNull(notes.courseId)),
          ),
        )
        .groupBy(notes.courseId),
      courseId
        ? []
        : db
            .select({ at: quizResults.completedAt })
            .from(quizResults)
            .where(and(eq(quizResults.userId, userId), gte(quizResults.completedAt, streakStart))),
      courseId
        ? []
        : db
            .select({ at: recordings.createdAt })
            .from(recordings)
            .where(and(eq(recordings.userId, userId), gte(recordings.createdAt, streakStart))),
    ]);

  const time = (d: Date | string | null) => (d ? new Date(d).getTime() : null);

  return {
    now,
    dayEnd,
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
  };
}
