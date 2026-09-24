import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { announcementEvents } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

/**
 * Ids come from the client's code registry, which the server doesn't know,
 * so the cap is what stops a caller filling the table with made-up ids.
 */
export const MAX_ANNOUNCEMENT_EVENTS_PER_USER = 300;

const eventBody = z.object({
  announcementId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/, "Invalid announcement id"),
  kind: z.enum(["seen", "dismissed", "clicked"]),
});

type EventRow = typeof announcementEvents.$inferSelect;

const toEventResponse = (row: EventRow) => ({
  announcementId: row.announcementId,
  kind: row.kind,
  at: row.at.getTime(),
});

/** Per-user state for the "What's new" announcements. */
export function createAnnouncementsRouter(db: Db) {
  const router = Router();

  router.get("/events", async (_req, res) => {
    const user = currentUser(res);
    const rows = await db
      .select()
      .from(announcementEvents)
      .where(eq(announcementEvents.userId, user.id))
      .orderBy(announcementEvents.at);
    res.json(rows.map(toEventResponse));
  });

  // Idempotent: recording the same kind twice keeps the first time.
  router.post("/events", async (req, res) => {
    const user = currentUser(res);
    const { announcementId, kind } = parse(eventBody, req.body);

    const { row, created } = await db.transaction(async (tx) => {
      // Serialise this user's writes so the cap can't be raced past.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`announcements:${user.id}`}))`);

      const [existing] = await tx
        .select()
        .from(announcementEvents)
        .where(
          and(
            eq(announcementEvents.userId, user.id),
            eq(announcementEvents.announcementId, announcementId),
            eq(announcementEvents.kind, kind),
          ),
        );
      if (existing) return { row: existing, created: false };

      const [{ count } = { count: 0 }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(announcementEvents)
        .where(eq(announcementEvents.userId, user.id));
      if (count >= MAX_ANNOUNCEMENT_EVENTS_PER_USER) {
        throw new HttpError(409, "Too many announcement events", "announcement_events_limit");
      }

      const [inserted] = await tx
        .insert(announcementEvents)
        .values({ userId: user.id, announcementId, kind })
        .returning();
      return { row: inserted!, created: true };
    });

    res.status(created ? 201 : 200).json(toEventResponse(row));
  });

  // Testing aid behind the dev-only "Reset announcements" button. It only
  // clears the caller's own state, so it is safe to leave on in production.
  router.delete("/events", async (_req, res) => {
    const user = currentUser(res);
    const deleted = await db
      .delete(announcementEvents)
      .where(eq(announcementEvents.userId, user.id))
      .returning({ id: announcementEvents.id });
    res.json({ deleted: deleted.length });
  });

  return router;
}
