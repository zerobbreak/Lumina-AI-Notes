import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { clientMessage, UserFacingError } from "../../ai/errors.js";
import type { Db } from "../../db/client.js";
import { deadlines, lmsConnections, lmsCourseLinks } from "../../db/schema/index.js";
import { createRemindersForDeadline, deleteRemindersForDeadline } from "../../deadlines/reminders.js";
import { safeGet, type FetchPolicy } from "../../net/safeGet.js";
import type { SecretBox } from "../secretBox.js";
import { ensureCourses } from "./courses.js";
import { parseFeed, parseFeedUrl, type FeedItem } from "./feed.js";

const FEED_MAX_BYTES = 5 * 1024 * 1024;
const FEED_TIMEOUT_MS = 20_000;

/** Swappable in tests; production uses safeGet with the real DNS guard. */
export type FeedFetcher = (url: URL) => Promise<string>;

export function createFeedFetcher(policy: FetchPolicy & { protocols?: string[] } = {}): FeedFetcher {
  return async (url) => {
    const res = await safeGet(url, {
      ...policy,
      protocols: policy.protocols ?? ["https:"],
      maxBytes: FEED_MAX_BYTES,
      timeoutMs: FEED_TIMEOUT_MS,
      accept: "text/calendar, text/plain;q=0.5",
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new UserFacingError(
        "Brightspace refused the calendar link. It may have been reset; copy a new Subscribe link from Brightspace Calendar.",
      );
    }
    if (res.status < 200 || res.status >= 300) {
      throw new UserFacingError(`Brightspace didn't send the calendar (HTTP ${res.status}). We'll try again later.`);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(res.body);
  };
}

/** Fetches and parses a feed; used when connecting, before anything is saved. */
export async function readFeed(rawUrl: string, fetchFeed: FeedFetcher, now = new Date()) {
  const url = parseFeedUrl(rawUrl);
  const items = parseFeed(await fetchFeed(url), now);
  return { url, items };
}

export type SyncResult =
  | { ok: true; added: number; updated: number; removed: number; courses: number }
  | { ok: false; error: string };

type Connection = typeof lmsConnections.$inferSelect;

/**
 * Brings one calendar-feed connection's deadlines in line with the feed.
 *
 * - Items become deadlines keyed by (connection, iCal UID); a re-sync updates
 *   title, time, kind, course and link, never the student's completedAt or notes.
 * - A course seen for the first time is matched to the student's course
 *   with the same code, or a Lumina course is created for it; mapped ones set courseId.
 *   Items in ignored courses aren't synced.
 * - A future, unfinished deadline that's gone from the feed (or whose course
 *   is now ignored) is removed. Past ones stay: feeds drop old items.
 * - A failure marks the connection `error` with a message for the student and
 *   leaves existing deadlines as they were.
 */
export async function syncFeedConnection(
  db: Db,
  box: SecretBox,
  connection: Connection,
  fetchFeed: FeedFetcher,
  now = new Date(),
): Promise<SyncResult> {
  let items: FeedItem[];
  try {
    ({ items } = await readFeed(box.open(connection.secret), fetchFeed, now));
  } catch (error) {
    if (!(error instanceof UserFacingError)) console.error(`[brightspace] sync ${connection.id} failed:`, error);
    const message = clientMessage(error, "We couldn't reach Brightspace. We'll try again later.");
    await db
      .update(lmsConnections)
      .set({ status: "error", lastError: message })
      .where(eq(lmsConnections.id, connection.id));
    return { ok: false, error: message };
  }
  return applyFeedItems(db, connection, items, now);
}

/** The write half of a sync, for items already fetched (connecting reads the feed to validate it). */
export async function applyFeedItems(
  db: Db,
  connection: Connection,
  items: FeedItem[],
  now = new Date(),
): Promise<SyncResult> {
  return db.transaction(async (tx) => {
    const courses = new Map(items.map((item) => [item.course.key, item.course]));
    if (courses.size > 0) {
      // Courses seen for the first time get a Lumina course: an existing one
      // with the same code, or a new one. Known links keep the student's choice,
      // including "No course" and "Don't sync".
      const known = new Set(
        (
          await tx
            .select({ key: lmsCourseLinks.externalKey })
            .from(lmsCourseLinks)
            .where(eq(lmsCourseLinks.connectionId, connection.id))
        ).map((row) => row.key),
      );
      const fresh = [...courses.values()].filter((course) => !known.has(course.key));
      const placed = await ensureCourses(tx, connection.userId, fresh);

      await tx
        .insert(lmsCourseLinks)
        .values(
          [...courses.values()].map((course) => ({
            userId: connection.userId,
            connectionId: connection.id,
            externalKey: course.key,
            externalName: course.name,
            courseId: placed.get(course.key) ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: [lmsCourseLinks.connectionId, lmsCourseLinks.externalKey],
          set: { externalName: sql`excluded.external_name` },
        });
    }
    const links = new Map(
      (await tx.select().from(lmsCourseLinks).where(eq(lmsCourseLinks.connectionId, connection.id))).map(
        (link) => [link.externalKey, link],
      ),
    );

    const existing = new Map(
      (await tx.select().from(deadlines).where(eq(deadlines.connectionId, connection.id))).map((row) => [
        row.externalId!,
        row,
      ]),
    );

    let added = 0;
    let updated = 0;
    const kept: string[] = [];
    for (const item of items) {
      const link = links.get(item.course.key);
      if (link?.ignored) continue;
      kept.push(item.uid);

      const values = {
        title: item.title,
        dueAt: item.dueAt,
        kind: item.kind,
        courseId: link?.courseId ?? null,
        externalUrl: item.url ?? null,
      };
      const row = existing.get(item.uid);
      if (!row) {
        const [created] = await tx
          .insert(deadlines)
          .values({
            ...values,
            userId: connection.userId,
            source: "brightspace",
            connectionId: connection.id,
            externalId: item.uid,
          })
          .returning();
        await createRemindersForDeadline(tx, { userId: connection.userId, deadlineId: created!.id, dueAt: item.dueAt });
        added++;
        continue;
      }

      const changed =
        row.title !== values.title ||
        row.dueAt.getTime() !== values.dueAt.getTime() ||
        row.kind !== values.kind ||
        row.courseId !== values.courseId ||
        row.externalUrl !== values.externalUrl;
      if (!changed) continue;
      await tx.update(deadlines).set(values).where(eq(deadlines.id, row.id));
      if (row.dueAt.getTime() !== values.dueAt.getTime() && !row.completedAt) {
        await deleteRemindersForDeadline(tx, row.id);
        await createRemindersForDeadline(tx, { userId: connection.userId, deadlineId: row.id, dueAt: item.dueAt });
      }
      updated++;
    }

    const gone = [...existing.values()]
      .filter((row) => !kept.includes(row.externalId!) && !row.completedAt && row.dueAt > now)
      .map((row) => row.id);
    if (gone.length > 0) {
      await tx
        .delete(deadlines)
        .where(
          and(
            inArray(deadlines.id, gone),
            eq(deadlines.connectionId, connection.id),
            isNull(deadlines.completedAt),
            gt(deadlines.dueAt, now),
          ),
        );
    }

    await tx
      .update(lmsConnections)
      .set({ status: "active", lastError: null, lastSyncedAt: now })
      .where(eq(lmsConnections.id, connection.id));

    return { ok: true, added, updated, removed: gone.length, courses: links.size };
  });
}
