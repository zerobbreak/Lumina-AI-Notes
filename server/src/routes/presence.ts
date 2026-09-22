import { and, eq, gt } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client.js";
import { notes, presence } from "../db/schema/index.js";
import { currentUser } from "../middleware/user.js";
import { requireNote } from "../notes/access.js";
import { presenceCutoff } from "../presence/constants.js";

/** Port of convex/presence.ts — who has a note open right now. */
export function createPresenceRouter(db: Db) {
  const router = Router({ mergeParams: true });

  /** heartbeat */
  router.post("/:id/presence/heartbeat", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;
    await requireNote(db, noteId, user.id, "view");

    const userName = user.name ?? user.email ?? "Anonymous";
    const now = new Date();

    await db
      .insert(presence)
      .values({ noteId, userId: user.id, userName, userImage: user.image, lastSeen: now })
      .onConflictDoUpdate({
        target: [presence.userId, presence.noteId],
        set: { lastSeen: now, userName, userImage: user.image },
      });

    res.json({ success: true });
  });

  /** leave */
  router.delete("/:id/presence", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;

    const [note] = await db.select({ id: notes.id }).from(notes).where(eq(notes.id, noteId)).limit(1);
    if (note) {
      await requireNote(db, noteId, user.id, "view");
    }

    await db.delete(presence).where(and(eq(presence.noteId, noteId), eq(presence.userId, user.id)));
    res.json({ success: true });
  });

  /** getViewers */
  router.get("/:id/presence/viewers", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;
    await requireNote(db, noteId, user.id, "view");

    const cutoff = presenceCutoff();
    const rows = await db
      .select()
      .from(presence)
      .where(and(eq(presence.noteId, noteId), gt(presence.lastSeen, cutoff)));

    const viewers = rows
      .filter((entry) => entry.userId !== user.id)
      .map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        userName: entry.userName ?? "Anonymous",
        userImage: entry.userImage,
        lastSeen: entry.lastSeen.getTime(),
      }));

    res.json(viewers);
  });

  /** getViewerCount */
  router.get("/:id/presence/count", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;
    await requireNote(db, noteId, user.id, "view");

    const cutoff = presenceCutoff();
    const rows = await db
      .select({ userId: presence.userId })
      .from(presence)
      .where(and(eq(presence.noteId, noteId), gt(presence.lastSeen, cutoff)));

    res.json({ count: rows.filter((entry) => entry.userId !== user.id).length });
  });

  return router;
}
