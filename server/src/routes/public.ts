import { and, eq } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client.js";
import { notes } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";

/**
 * Routes anyone can call, without signing in. Mounted ahead of the
 * authenticated /api/v1 router.
 */
export function createPublicRouter(db: Db) {
  const router = Router();

  // getPublicNote: the /share/<id> page. Only what that page shows; no owner,
  // folder or tag ids.
  router.get("/notes/:id", async (req, res) => {
    const [note] = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        style: notes.style,
        outlineData: notes.outlineData,
        outlineMetadata: notes.outlineMetadata,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(eq(notes.id, req.params.id), eq(notes.isShared, true)))
      .limit(1);
    if (!note) {
      throw new HttpError(404, "Note not found", "not_found");
    }
    // Unsharing must take effect at once, so nothing may keep a copy.
    res.set("Cache-Control", "no-store");
    res.json(note);
  });

  return router;
}
