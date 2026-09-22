import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { notifications } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { toNotificationResponse } from "../notifications/serialize.js";
import { parse } from "./validation.js";

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const rowId = z.string().min(1).max(200);

/** In-app notifications (deadline reminders today; more types later). */
export function createNotificationsRouter(db: Db) {
  const router = Router();

  router.get("/", async (req, res) => {
    const user = currentUser(res);
    const { limit = 50, unreadOnly = false } = parse(listQuery, req.query);

    const rows = await db
      .select()
      .from(notifications)
      .where(
        unreadOnly
          ? and(eq(notifications.userId, user.id), isNull(notifications.readAt))
          : eq(notifications.userId, user.id),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    res.json(rows.map(toNotificationResponse));
  });

  router.get("/unread-count", async (_req, res) => {
    const user = currentUser(res);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    res.json({ count: row?.count ?? 0 });
  });

  router.patch("/:id/read", async (req, res) => {
    const user = currentUser(res);
    const id = parse(rowId, req.params.id);
    const now = new Date();

    const [updated] = await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .returning();

    if (!updated) {
      throw new HttpError(404, "Notification not found", "not_found");
    }

    res.json(toNotificationResponse(updated));
  });

  router.post("/mark-all-read", async (_req, res) => {
    const user = currentUser(res);
    const now = new Date();

    const updated = await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
      .returning({ id: notifications.id });

    res.json({ updated: updated.length });
  });

  return router;
}
