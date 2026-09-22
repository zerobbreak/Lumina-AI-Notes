import { lt } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { presence } from "../../db/schema/index.js";
import { presenceCutoff } from "../../presence/constants.js";

/** Removes presence rows older than the heartbeat window. */
export async function cleanupStalePresence(db: Db) {
  const cutoff = presenceCutoff();
  const deleted = await db.delete(presence).where(lt(presence.lastSeen, cutoff)).returning({ id: presence.id });
  return { deleted: deleted.length };
}
