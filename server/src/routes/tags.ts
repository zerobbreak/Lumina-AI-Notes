import { and, asc, count, desc, eq, isNull, ne } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { notes, noteTags, tags } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

/** Keeps a runaway auto-tagger (or script) from flooding the sidebar. */
export const MAX_TAGS_PER_USER = 200;

type Tag = typeof tags.$inferSelect;

// Names are case-sensitive, as on Convex: "Exam" and "exam" are different tags.
const name = z.string().trim().min(1).max(50);
const color = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Color must be a hex code like #6366f1");

const createBody = z.object({ name, color });
const updateBody = z.object({ name, color }).partial();

/** Postgres unique_violation, as drizzle wraps it. */
function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/** Port of the client-facing half of convex/tags.ts. Auto-tagging waits for the AI batch. */
export function createTagsRouter(db: Db) {
  const router = Router();

  async function findOwned(tagId: string, userId: string) {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1);
    if (!tag) throw new HttpError(404, "Tag not found", "not_found");
    return tag;
  }

  /** A name the user already has: 409 with that tag, so the client can use it instead. */
  async function sendDuplicate(res: Response, userId: string, tagName: string) {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, tagName)))
      .limit(1);
    res.status(409).json({
      error: { code: "tag_exists", message: `You already have a tag called "${tagName}"` },
      tag: existing,
    });
  }

  // getTags / getTagsWithCounts: counts top-level notes (archived included), most-used first.
  router.get("/", async (_req, res) => {
    const user = currentUser(res);
    const noteCount = count(notes.id);
    const rows = await db
      .select({ id: tags.id, userId: tags.userId, name: tags.name, color: tags.color, createdAt: tags.createdAt, count: noteCount })
      .from(tags)
      .leftJoin(noteTags, eq(noteTags.tagId, tags.id))
      .leftJoin(notes, and(eq(notes.id, noteTags.noteId), isNull(notes.parentNoteId)))
      .where(eq(tags.userId, user.id))
      .groupBy(tags.id)
      .orderBy(desc(noteCount), asc(tags.name));
    res.json(rows);
  });

  // createTag
  router.post("/", async (req, res) => {
    const user = currentUser(res);
    const body = parse(createBody, req.body);

    const [{ n }] = await db.select({ n: count() }).from(tags).where(eq(tags.userId, user.id));
    if (n >= MAX_TAGS_PER_USER) {
      throw new HttpError(400, `You can have at most ${MAX_TAGS_PER_USER} tags`, "too_many_tags");
    }

    const [tag] = await db
      .insert(tags)
      .values({ userId: user.id, ...body })
      .onConflictDoNothing({ target: [tags.userId, tags.name] })
      .returning();
    if (!tag) {
      await sendDuplicate(res, user.id, body.name);
      return;
    }
    res.status(201).json(tag);
  });

  // updateTag: rename and/or recolour.
  router.patch("/:id", async (req, res) => {
    const user = currentUser(res);
    const body = parse(updateBody, req.body);
    const tag = await findOwned(req.params.id, user.id);
    if (!body.name && !body.color) {
      res.json(tag);
      return;
    }

    if (body.name && body.name !== tag.name) {
      const [clash] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, user.id), eq(tags.name, body.name), ne(tags.id, tag.id)))
        .limit(1);
      if (clash) {
        await sendDuplicate(res, user.id, body.name);
        return;
      }
    }

    let updated: Tag;
    try {
      [updated] = await db.update(tags).set(body).where(eq(tags.id, tag.id)).returning();
    } catch (err) {
      // Lost a race with a create or rename to the same name.
      if (body.name && isUniqueViolation(err)) {
        await sendDuplicate(res, user.id, body.name);
        return;
      }
      throw err;
    }
    res.json(updated);
  });

  // deleteTag. Convex left the id dangling in notes.tagIds; note_tags rows go with it here.
  router.delete("/:id", async (req, res) => {
    const tag = await findOwned(req.params.id, currentUser(res).id);
    await db.delete(tags).where(eq(tags.id, tag.id));
    res.status(204).end();
  });

  return router;
}
