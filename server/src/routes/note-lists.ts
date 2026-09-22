import { and, asc, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { notes, noteTags } from "../db/schema/index.js";
import { currentUser } from "../middleware/user.js";
import { canView, noteColumns, requireNote } from "../notes/access.js";
import { linkedDocumentIdsByNoteIds, withLinkedDocumentIds } from "../notes/linkedFiles.js";
import { noteIdsWithAllTags, tagIdsByNoteIds } from "../notes/tagFilters.js";
import { matchesSearch } from "../search/fullText.js";
import { parse } from "./validation.js";

// Lists skip the note body, which can be megabytes. Cards get a short
// plain-text preview and an outline flag instead.
const { content: _content, outlineData: _outlineData, ...listColumns } = noteColumns;
const PREVIEW_CHARS = 200;

const listSelection = {
  ...listColumns,
  // Enough HTML to find ~200 characters of text, without reading the whole note.
  contentHead: sql<string | null>`left(${notes.content}, 4000)`,
  hasOutline: sql<boolean>`coalesce(btrim(${notes.outlineData}) <> '', false)`,
};

/** Plain text from the start of a note's HTML. Mirrors NoteCard's stripHtmlToText. */
export function toPreview(html: string | null) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    // The head was cut off, maybe mid-tag.
    .replace(/<[^>]*$/, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_CHARS);
}

type ListRow = { id: string; contentHead: string | null } & Record<string, unknown>;
const toListItem = ({ contentHead, ...note }: ListRow) => ({ ...note, preview: toPreview(contentHead) });

/**
 * A quick note: not inside another note, and either marked "quick" or (older
 * notes with no type) filed nowhere.
 */
const isQuickNote = and(
  isNull(notes.parentNoteId),
  or(
    eq(notes.noteType, "quick"),
    and(isNull(notes.noteType), isNull(notes.courseId), isNull(notes.moduleId)),
  ),
);

const notArchived = eq(notes.isArchived, false);

/** Beyond this gap since the note was last opened, resuming it stops being the safe default. */
const RESUME_STALE_MS = 3 * 24 * 60 * 60 * 1000;

const limitQuery = (fallback: number) =>
  z.object({ limit: z.coerce.number().int().min(1).max(100).default(fallback) });

const filterQuery = z
  .object({ courseId: z.string().max(200), moduleId: z.string().max(200), tagId: z.string().max(200) })
  .partial()
  .refine((q) => q.courseId || q.moduleId || q.tagId, { message: "Filter by courseId, moduleId or tagId" });

const rowId = z.string().min(1).max(200);

const tagIdsQuery = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return val;
}, z.array(rowId).optional());

const searchNotesQuery = z.object({
  query: z.string().trim().optional(),
  noteType: z.string().max(50).optional(),
  courseId: rowId.optional(),
  tagIds: tagIdsQuery,
});

/** Port of the list queries in convex/notes.ts. Mounted before the single-note routes. */
export function createNoteListsRouter(db: Db) {
  const router = Router();

  const list = async (where: SQL | undefined, order: SQL[], limit?: number) => {
    const query = db
      .select(listSelection)
      .from(notes)
      .where(where)
      .orderBy(...order);
    const rows = await (limit ? query.limit(limit) : query);
    const items = rows.map(toListItem);
    const linkedByNoteId = await linkedDocumentIdsByNoteIds(
      db,
      items.map((item) => item.id as string),
    );
    return withLinkedDocumentIds(items, linkedByNoteId);
  };

  // getQuickNotes: the sidebar's Quick Notes, including ones shared with the caller.
  router.get("/quick", async (req, res) => {
    const { limit } = parse(limitQuery(10), req.query);
    const user = currentUser(res);
    res.json(await list(and(canView(db, user.id), notArchived, isQuickNote), [desc(notes.createdAt)], limit));
  });

  // getRecentNotes: newest notes of any kind, including shared ones.
  router.get("/recent", async (req, res) => {
    const { limit } = parse(limitQuery(5), req.query);
    const user = currentUser(res);
    res.json(await list(and(canView(db, user.id), notArchived), [desc(notes.createdAt)], limit));
  });

  // getArchivedNotes
  router.get("/archived", async (_req, res) => {
    const user = currentUser(res);
    res.json(await list(and(eq(notes.userId, user.id), eq(notes.isArchived, true)), [desc(notes.createdAt)]));
  });

  // getPinnedNotes
  router.get("/pinned", async (req, res) => {
    const { limit } = parse(limitQuery(20), req.query);
    const user = currentUser(res);
    const where = and(eq(notes.userId, user.id), eq(notes.isPinned, true), notArchived);
    res.json(await list(where, [desc(notes.createdAt)], limit));
  });

  // getResumeTarget: what /dashboard should open.
  router.get("/resume-target", async (_req, res) => {
    const user = currentUser(res);
    const [latest] = await db
      .select({ id: notes.id, lastAccessedAt: notes.lastAccessedAt, createdAt: notes.createdAt })
      .from(notes)
      .where(and(eq(notes.userId, user.id), notArchived))
      // Postgres sorts nulls first in descending order; never-opened notes go last.
      .orderBy(sql`${notes.lastAccessedAt} desc nulls last`)
      .limit(1);

    const lastOpened = latest && (latest.lastAccessedAt ?? latest.createdAt);
    if (!lastOpened || Date.now() - lastOpened.getTime() > RESUME_STALE_MS) {
      res.json({ target: "home" });
      return;
    }
    res.json({ target: "note", noteId: latest.id });
  });

  // searchNotes: full notes for the caller's library, with optional title search and filters.
  router.get("/search", async (req, res) => {
    const user = currentUser(res);
    const args = parse(searchNotesQuery, req.query);

    const rows = args.query
      ? await db
          .select(noteColumns)
          .from(notes)
          .where(and(eq(notes.userId, user.id), matchesSearch(notes.searchTitle, args.query)))
          .orderBy(
            desc(sql`ts_rank(${notes.searchTitle}, websearch_to_tsquery('english', ${args.query}))`),
          )
      : await db
          .select(noteColumns)
          .from(notes)
          .where(eq(notes.userId, user.id))
          .orderBy(desc(notes.createdAt))
          .limit(200);

    let filtered = rows.filter((n) => {
      if (n.isArchived) return false;
      if (args.noteType && n.noteType !== args.noteType) return false;
      if (args.courseId && n.courseId !== args.courseId) return false;
      return true;
    });

    if (args.tagIds?.length) {
      const allowed = await noteIdsWithAllTags(db, user.id, args.tagIds);
      filtered = filtered.filter((n) => allowed.has(n.id));
    }

    const noteIds = filtered.map((n) => n.id);
    const [tagMap, linkedByNoteId] = await Promise.all([
      tagIdsByNoteIds(db, noteIds),
      linkedDocumentIdsByNoteIds(db, noteIds),
    ]);
    res.json(
      filtered.map((n) => ({
        ...n,
        tagIds: tagMap.get(n.id) ?? [],
        linkedDocumentIds: linkedByNoteId.get(n.id) ?? [],
      })),
    );
  });

  // getNotesByContext (?courseId= / ?moduleId=) includes shared notes;
  // getNotesByTag (?tagId= alone) is owner-only, matching Convex.
  router.get("/", async (req, res) => {
    const { courseId, moduleId, tagId } = parse(filterQuery, req.query);
    const user = currentUser(res);
    const filters: SQL[] = [isNull(notes.parentNoteId)];
    if (courseId || moduleId) {
      filters.push(canView(db, user.id));
    } else {
      filters.push(eq(notes.userId, user.id));
    }
    if (moduleId) filters.push(eq(notes.moduleId, moduleId));
    else if (courseId) filters.push(eq(notes.courseId, courseId));
    if (tagId) {
      filters.push(
        sql`exists (select 1 from ${noteTags} where ${noteTags.noteId} = ${notes.id} and ${noteTags.tagId} = ${tagId})`,
      );
    }
    res.json(await list(and(...filters), [asc(notes.createdAt)]));
  });

  // getChildNotes: the sub-pages the caller can see, newest first.
  router.get("/:id/children", async (req, res) => {
    const user = currentUser(res);
    const { note } = await requireNote(db, req.params.id, user.id, "view");
    res.json(await list(and(eq(notes.parentNoteId, note.id), canView(db, user.id)), [desc(notes.createdAt)]));
  });

  return router;
}
