import { and, count, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { clientMessage, UserFacingError } from "../ai/errors.js";
import type { Db } from "../db/client.js";
import { deadlines, lmsConnections, lmsCourseLinks } from "../db/schema/index.js";
import {
  applyFeedItems,
  readFeed,
  syncFeedConnection,
  type FeedFetcher,
  type SyncResult,
} from "../integrations/brightspace/sync.js";
import type { SecretBox } from "../integrations/secretBox.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser, type User } from "../middleware/user.js";
import { parse } from "./validation.js";

/** A student pressing "Sync now" repeatedly shouldn't hammer their school's server. */
export const MANUAL_SYNC_COOLDOWN_MS = 60_000;

const feedBody = z.object({ url: z.string().trim().min(1).max(2048) });

const coursesBody = z.object({
  courses: z
    .array(
      z.object({
        id: z.string().min(1),
        courseId: z.string().min(1).nullable(),
        ignored: z.boolean(),
      }),
    )
    .max(200),
});

type Connection = typeof lmsConnections.$inferSelect;

/**
 * Brightspace, phase 1: the student's calendar feed. The feed URL is a secret
 * (it carries a token), so it's sealed before it's stored and never sent back.
 */
export function createBrightspaceRouter(
  db: Db,
  box: SecretBox,
  fetchFeed: FeedFetcher,
  options: { hasKey: boolean },
) {
  const router = Router();

  // Without the key nothing can be stored or read; say so plainly.
  router.use((_req, _res, next) => {
    if (!options.hasKey) {
      throw new HttpError(503, "Brightspace isn't set up on this server yet", "integration_unavailable");
    }
    next();
  });

  async function findConnection(userId: string) {
    const [row] = await db
      .select()
      .from(lmsConnections)
      .where(and(eq(lmsConnections.userId, userId), eq(lmsConnections.provider, "brightspace")))
      .limit(1);
    return row;
  }

  async function requireConnection(userId: string) {
    const row = await findConnection(userId);
    if (!row) throw new HttpError(404, "Brightspace isn't connected", "not_connected");
    return row;
  }

  async function status(user: User) {
    const connection = await findConnection(user.id);
    if (!connection) return { connected: false as const };

    const links = await db
      .select()
      .from(lmsCourseLinks)
      .where(eq(lmsCourseLinks.connectionId, connection.id))
      .orderBy(lmsCourseLinks.externalName);
    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(deadlines)
      .where(eq(deadlines.connectionId, connection.id));

    return {
      connected: true as const,
      kind: connection.kind,
      host: connection.host,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      lastError: connection.lastError ?? undefined,
      deadlineCount: total,
      courses: links.map((link) => ({
        id: link.id,
        name: link.externalName,
        courseId: link.courseId,
        ignored: link.ignored,
      })),
    };
  }

  const sync = (connection: Connection): Promise<SyncResult> => syncFeedConnection(db, box, connection, fetchFeed);

  router.get("/", async (_req, res) => {
    res.json(await status(currentUser(res)));
  });

  // Connect, or replace the link (e.g. after resetting it in Brightspace).
  // The feed is fetched and parsed first, so a bad link is never saved.
  router.post("/feed", async (req, res) => {
    const user = currentUser(res);
    const { url: raw } = parse(feedBody, req.body);

    let feed: Awaited<ReturnType<typeof readFeed>>;
    try {
      feed = await readFeed(raw, fetchFeed);
    } catch (error) {
      if (!(error instanceof UserFacingError)) console.error("[brightspace] connect failed:", error);
      throw new HttpError(400, clientMessage(error, "We couldn't reach that link. Check it and try again."), "invalid_feed");
    }

    const values = {
      kind: "ical" as const,
      host: feed.url.hostname,
      secret: box.seal(feed.url.href),
      secretExpiresAt: null,
      externalUserId: null,
      status: "active" as const,
      lastError: null,
    };
    // Reconnecting keeps the connection row, so its deadlines and course
    // choices survive a new link.
    const [connection] = await db
      .insert(lmsConnections)
      .values({ userId: user.id, provider: "brightspace", ...values })
      .onConflictDoUpdate({ target: [lmsConnections.userId, lmsConnections.provider], set: values })
      .returning();

    const result = await applyFeedItems(db, connection!, feed.items);
    res.status(201).json({ ...(await status(user)), sync: result });
  });

  router.post("/sync", async (_req, res) => {
    const user = currentUser(res);
    const connection = await requireConnection(user.id);
    const last = connection.lastSyncedAt?.getTime() ?? 0;
    if (Date.now() - last < MANUAL_SYNC_COOLDOWN_MS) {
      throw new HttpError(429, "Brightspace was synced a moment ago. Try again in a minute.", "sync_too_soon");
    }
    const result = await sync(connection);
    res.json({ ...(await status(user)), sync: result });
  });

  // The whole course-matching step in one save, then one sync to re-file deadlines.
  router.put("/courses", async (req, res) => {
    const user = currentUser(res);
    const { courses } = parse(coursesBody, req.body);
    const connection = await requireConnection(user.id);

    const ownCourseIds = new Set((user.courses ?? []).map((course) => course.id));
    const unknownCourse = courses.find((course) => course.courseId && !ownCourseIds.has(course.courseId));
    if (unknownCourse) throw new HttpError(404, "Course not found", "not_found");

    const ids = courses.map((course) => course.id);
    const links = ids.length
      ? await db
          .select({ id: lmsCourseLinks.id })
          .from(lmsCourseLinks)
          .where(and(eq(lmsCourseLinks.connectionId, connection.id), inArray(lmsCourseLinks.id, ids)))
      : [];
    if (links.length !== new Set(ids).size) throw new HttpError(404, "Brightspace course not found", "not_found");

    await db.transaction(async (tx) => {
      for (const course of courses) {
        await tx
          .update(lmsCourseLinks)
          .set({ courseId: course.ignored ? null : course.courseId, ignored: course.ignored })
          .where(eq(lmsCourseLinks.id, course.id));
      }
    });

    const result = await sync(connection);
    res.json({ ...(await status(user)), sync: result });
  });

  // Disconnect: the connection, its course links and every deadline it synced go.
  router.delete("/", async (_req, res) => {
    const user = currentUser(res);
    await db
      .delete(lmsConnections)
      .where(and(eq(lmsConnections.userId, user.id), eq(lmsConnections.provider, "brightspace")));
    res.status(204).end();
  });

  return router;
}
