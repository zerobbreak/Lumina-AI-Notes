import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { notes } from "../db/schema/index.js";
import { loadStudyInput } from "../home/loadInput.js";
import { buildHomeSummary, RUNWAY_DAYS, type HomeResume } from "../home/summary.js";
import { currentUser } from "../middleware/user.js";
import { toPreview } from "./note-lists.js";
import { parse, tzOffsetMinutes } from "./validation.js";

const DAY = 24 * 60 * 60 * 1000;
/** A note last opened longer ago than this isn't offered as "pick up where you left off". */
const RESUME_WINDOW = 14 * DAY;

export const homeQuery = z.object({
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
    const dayEnd = localDayEnd(now, offset);

    const [input, [lastNote]] = await Promise.all([
      loadStudyInput(db, user.id, {
        now,
        dayEnd,
        deadlinesFrom: now - RUNWAY_DAYS * DAY,
        deadlinesTo: now + RUNWAY_DAYS * DAY,
      }),
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
    ]);

    const summary = buildHomeSummary({ ...input, courses: user.courses ?? [] });

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
