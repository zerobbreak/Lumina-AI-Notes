import { eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { lmsConnections } from "../../db/schema/index.js";
import { syncFeedConnection, type FeedFetcher } from "../../integrations/brightspace/sync.js";
import type { SecretBox } from "../../integrations/secretBox.js";

/**
 * Re-reads every student's Brightspace calendar feed, least recently synced
 * first. A few at a time: each is an outbound request to a school's server.
 * One feed failing marks that connection and moves on.
 */
export async function syncBrightspaceFeeds(
  db: Db,
  box: SecretBox,
  fetchFeed: FeedFetcher,
  { limit = 500, concurrency = 4 } = {},
) {
  const connections = await db
    .select()
    .from(lmsConnections)
    .where(eq(lmsConnections.kind, "ical"))
    .orderBy(sql`${lmsConnections.lastSyncedAt} asc nulls first`)
    .limit(limit);

  let synced = 0;
  let failed = 0;
  const queue = [...connections];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const result = await syncFeedConnection(db, box, next, fetchFeed).catch((error: unknown) => {
        console.error(`[brightspace] sync ${next!.id} crashed:`, error);
        return { ok: false as const };
      });
      if (result.ok) synced++;
      else failed++;
    }
  });
  await Promise.all(workers);
  return { connections: connections.length, synced, failed };
}
