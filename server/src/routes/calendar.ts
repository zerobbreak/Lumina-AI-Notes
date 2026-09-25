import { and, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { flashcardReviewEvents, notes, quizResults, recordings } from "../db/schema/index.js";
import { currentUser } from "../middleware/user.js";
import { parse, tzOffsetMinutes } from "./validation.js";

const activityQuery = z
  .object({
    startMs: z.coerce.number().int().min(0),
    endMs: z.coerce.number().int().min(0),
    /** `Date#getTimezoneOffset()`: minutes to add to local time to get UTC. */
    tzOffsetMinutes: z.coerce.number().pipe(tzOffsetMinutes).default(0),
  })
  .refine((q) => q.endMs >= q.startMs, { message: "endMs must not be before startMs" })
  // Six weeks: a month grid with the days either side of it.
  .refine((q) => q.endMs - q.startMs <= 45 * 24 * 60 * 60 * 1000, { message: "Range is too long" });

/** The user's local calendar day of a timestamp column, as YYYY-MM-DD. */
function localDay(column: AnyPgColumn, offsetMinutes: number): SQL<string> {
  // Inlined rather than bound: GROUP BY needs the same text as the SELECT, and
  // two bound parameters don't count as the same expression. It's a validated int.
  const offset = sql.raw(String(Math.trunc(offsetMinutes)));
  return sql<string>`to_char((${column} - make_interval(mins => ${offset})) at time zone 'UTC', 'YYYY-MM-DD')`;
}

/** Port of convex/calendar.ts — what the user made and studied, by day. */
export function createCalendarRouter(db: Db) {
  const router = Router();

  router.get("/activity", async (req, res) => {
    const user = currentUser(res);
    const { startMs, endMs, tzOffsetMinutes: offset } = parse(activityQuery, req.query);
    const start = new Date(startMs);
    const end = new Date(endMs);

    const reviewDay = localDay(flashcardReviewEvents.reviewedAt, offset);
    const quizDay = localDay(quizResults.completedAt, offset);

    const [recordingRows, noteRows, reviewRows, quizRows] = await Promise.all([
      db
        .select({
          id: recordings.id,
          userId: recordings.userId,
          sessionId: recordings.sessionId,
          title: recordings.title,
          duration: recordings.duration,
          createdAt: recordings.createdAt,
        })
        .from(recordings)
        .where(
          and(eq(recordings.userId, user.id), gte(recordings.createdAt, start), lte(recordings.createdAt, end)),
        ),
      db
        .select({
          id: notes.id,
          userId: notes.userId,
          title: notes.title,
          courseId: notes.courseId,
          moduleId: notes.moduleId,
          quickCaptureStatus: notes.quickCaptureStatus,
          createdAt: notes.createdAt,
        })
        .from(notes)
        .where(
          and(
            eq(notes.userId, user.id),
            gte(notes.createdAt, start),
            lte(notes.createdAt, end),
            ne(notes.isArchived, true),
          ),
        ),
      db
        .select({ day: reviewDay, count: sql<number>`count(*)::int` })
        .from(flashcardReviewEvents)
        .where(
          and(
            eq(flashcardReviewEvents.userId, user.id),
            gte(flashcardReviewEvents.reviewedAt, start),
            lte(flashcardReviewEvents.reviewedAt, end),
          ),
        )
        .groupBy(reviewDay),
      db
        .select({ day: quizDay, count: sql<number>`count(*)::int` })
        .from(quizResults)
        .where(
          and(eq(quizResults.userId, user.id), gte(quizResults.completedAt, start), lte(quizResults.completedAt, end)),
        )
        .groupBy(quizDay),
    ]);

    const study = new Map<string, { day: string; reviews: number; quizzes: number }>();
    const dayOf = (day: string) => {
      if (!study.has(day)) study.set(day, { day, reviews: 0, quizzes: 0 });
      return study.get(day)!;
    };
    for (const r of reviewRows) dayOf(r.day).reviews = r.count;
    for (const q of quizRows) dayOf(q.day).quizzes = q.count;

    res.json({
      recordings: recordingRows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })),
      notes: noteRows.map((n) => ({ ...n, createdAt: n.createdAt.getTime() })),
      study: [...study.values()].sort((a, b) => a.day.localeCompare(b.day)),
    });
  });

  return router;
}
