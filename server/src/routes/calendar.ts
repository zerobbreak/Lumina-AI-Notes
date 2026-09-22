import { and, eq, gte, lte, ne } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { notes, recordings } from "../db/schema/index.js";
import { noteColumns } from "../notes/access.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

const activityQuery = z.object({
  startMs: z.coerce.number().int().min(0),
  endMs: z.coerce.number().int().min(0),
});

function toRecordingActivity(row: typeof recordings.$inferSelect) {
  return { ...row, createdAt: row.createdAt.getTime() };
}

function toNoteActivity(row: Pick<typeof notes.$inferSelect, keyof typeof noteColumns>) {
  return { ...row, createdAt: row.createdAt.getTime() };
}

/** Port of convex/calendar.ts — recording and note activity by createdAt range. */
export function createCalendarRouter(db: Db) {
  const router = Router();

  router.get("/activity", async (req, res) => {
    const user = currentUser(res);
    const { startMs, endMs } = parse(activityQuery, req.query);
    const start = new Date(startMs);
    const end = new Date(endMs);

    const recordingRows = await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.userId, user.id),
          gte(recordings.createdAt, start),
          lte(recordings.createdAt, end),
        ),
      );

    const noteRows = await db
      .select(noteColumns)
      .from(notes)
      .where(
        and(
          eq(notes.userId, user.id),
          gte(notes.createdAt, start),
          lte(notes.createdAt, end),
          ne(notes.isArchived, true),
        ),
      );

    res.json({
      recordings: recordingRows.map(toRecordingActivity),
      notes: noteRows.map(toNoteActivity),
    });
  });

  return router;
}
