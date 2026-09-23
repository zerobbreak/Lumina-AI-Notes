import { and, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import {
  files,
  noteCollaborators,
  noteLinkedFiles,
  notes,
  noteTags,
  recordings,
  tags,
  users,
  type Course,
} from "../db/schema/index.js";
import { autoTagNote, shouldScheduleAutoTag } from "../tags/autoTag.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser, type User } from "../middleware/user.js";
import { noteColumns, requireNote } from "../notes/access.js";
import { linkedDocumentIdsOf } from "../notes/linkedFiles.js";
import { NOTE_STYLES, noteStyle } from "./users.js";
import { parse } from "./validation.js";

type NoteRow = { [K in keyof typeof noteColumns]: (typeof notes.$inferSelect)[K] };

const rowId = z.string().min(1).max(200);

/**
 * Largest content or outline a note can hold, in characters. Convex capped
 * whole documents at 1 MiB, so no imported note is near this.
 */
export const MAX_NOTE_CHARS = 2_000_000;
const TOO_LARGE = "This note is too large to save";

/** Fields both create and update accept. */
const noteFields = {
  title: z.string().trim().max(500),
  content: z.string().max(MAX_NOTE_CHARS, TOO_LARGE),
  style: noteStyle,
  tagIds: z.array(rowId).max(50),
  wordCount: z.number().int().min(0),
  quickCaptureType: z.enum(["text", "voice"]),
  quickCaptureAudioUrl: z.string().max(2048),
  quickCaptureStatus: z.enum(["draft", "expanded"]),
  quickCaptureExpandedNoteId: rowId,
  sourceRecordingId: rowId,
};

const createBody = z
  .object({
    ...noteFields,
    major: z.string().trim().max(100),
    courseId: rowId,
    moduleId: rowId,
    parentNoteId: rowId,
    noteType: z.enum(["quick", "page"]),
  })
  .partial()
  .required({ title: true });

/** Autosave fields. Saving any of them needs the version the edit started from. */
const CONTENT_FIELDS = ["content", "outlineData", "outlineMetadata", "wordCount"] as const;

/** Only the owner can change these: tags, and how the note is filed or shared. */
const OWNER_FIELDS = ["tagIds", "isArchived", "isPinned", "isShared"] as const;

const moveBody = z
  .object({ courseId: rowId, moduleId: rowId })
  .partial()
  .refine((b) => b.courseId || b.moduleId, { message: "Send a courseId or moduleId to move to" });

const updateBody = z
  .object({
    ...noteFields,
    // Outline mode keeps its tree as a JSON string the client parses.
    outlineData: z.string().max(MAX_NOTE_CHARS, TOO_LARGE),
    outlineMetadata: z.object({
      totalItems: z.number().int().min(0),
      completedTasks: z.number().int().min(0),
      collapsedNodes: z.array(z.string().max(200)).max(10_000),
    }),
    version: z.number().int().min(0),
    // Owner only. Convex toggled these; explicit values are safe to retry.
    isArchived: z.boolean(),
    isPinned: z.boolean(),
    isShared: z.boolean(),
  })
  .partial()
  .refine((b) => b.version !== undefined || !CONTENT_FIELDS.some((f) => b[f] !== undefined), {
    message: "Send the note's version with content changes",
  });

/**
 * Checks folder ids the client sent against the owner's courses. A module on
 * its own finds its course.
 */
function resolveFolder(courses: Course[], courseId?: string, moduleId?: string) {
  const course = courseId
    ? courses.find((c) => c.id === courseId)
    : courses.find((c) => c.modules?.some((m) => m.id === moduleId));
  if (!course) throw new HttpError(400, "Unknown course or module", "invalid_request");
  if (moduleId && !course.modules?.some((m) => m.id === moduleId)) {
    throw new HttpError(400, "That module isn't in this course", "invalid_request");
  }
  return { courseId: course.id, moduleId };
}

const isNoteStyle = (s: string | null | undefined): s is (typeof NOTE_STYLES)[number] =>
  NOTE_STYLES.includes(s as (typeof NOTE_STYLES)[number]);

/** Port of the core of convex/notes.ts: create, read, update, delete, touch. */
export function createNotesRouter(db: Db) {
  const router = Router();

  async function tagIdsOf(noteId: string) {
    const rows = await db.select({ tagId: noteTags.tagId }).from(noteTags).where(eq(noteTags.noteId, noteId));
    return rows.map((r) => r.tagId);
  }

  async function toResponse(note: NoteRow, tagIds?: string[]) {
    const [resolvedTagIds, linkedDocumentIds] = await Promise.all([
      tagIds ?? tagIdsOf(note.id),
      linkedDocumentIdsOf(db, note.id),
    ]);
    return { ...note, tagIds: resolvedTagIds, linkedDocumentIds };
  }

  /** Every id the client points at must belong to the note's owner. */
  async function checkRefs(
    ownerId: string,
    refs: { tagIds?: string[]; sourceRecordingId?: string; quickCaptureExpandedNoteId?: string },
  ) {
    if (refs.tagIds?.length) {
      const unique = [...new Set(refs.tagIds)];
      const found = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, ownerId), inArray(tags.id, unique)));
      if (found.length !== unique.length) throw new HttpError(400, "Unknown tag", "invalid_request");
    }
    if (refs.sourceRecordingId) {
      const [found] = await db
        .select({ id: recordings.id })
        .from(recordings)
        .where(and(eq(recordings.id, refs.sourceRecordingId), eq(recordings.userId, ownerId)));
      if (!found) throw new HttpError(400, "Unknown recording", "invalid_request");
    }
    if (refs.quickCaptureExpandedNoteId) {
      const [found] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.id, refs.quickCaptureExpandedNoteId), eq(notes.userId, ownerId)));
      if (!found) throw new HttpError(400, "Unknown note", "invalid_request");
    }
  }

  // createNote
  router.post("/", async (req, res) => {
    const caller = currentUser(res);
    const body = parse(createBody, req.body);

    // A sub-page lives with its parent: an editor adding one to someone else's
    // note creates it for the owner, and gets editor access to it.
    let owner: User = caller;
    let parent: NoteRow | undefined;
    if (body.parentNoteId) {
      ({ note: parent } = await requireNote(db, body.parentNoteId, caller.id, "edit"));
      if (parent.userId !== caller.id) {
        [owner] = await db.select().from(users).where(eq(users.id, parent.userId));
      }
    }
    if (body.tagIds?.length && owner.id !== caller.id) {
      throw new HttpError(403, "Only the note's owner can tag it", "forbidden");
    }

    // An explicit folder wins; otherwise a sub-page files itself with its parent.
    const { courseId, moduleId } =
      body.courseId || body.moduleId
        ? resolveFolder(owner.courses ?? [], body.courseId, body.moduleId)
        : { courseId: parent?.courseId ?? undefined, moduleId: parent?.moduleId ?? undefined };
    const course = owner.courses?.find((c) => c.id === courseId);

    await checkRefs(owner.id, body);

    const now = new Date();
    const tagIds = [...new Set(body.tagIds ?? [])];
    const note = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(notes)
        .values({
          userId: owner.id,
          title: body.title,
          content: body.content ?? "",
          noteType: body.noteType ?? (courseId || moduleId || parent ? "page" : "quick"),
          major: body.major,
          courseId,
          moduleId,
          parentNoteId: parent?.id,
          // Onboarding's choices: the course's style, then the user's, then standard.
          style:
            body.style ??
            [course?.defaultNoteStyle, owner.noteStyle].find(isNoteStyle) ??
            "standard",
          wordCount: body.wordCount ?? 0,
          lastAccessedAt: now,
          quickCaptureType: body.quickCaptureType,
          quickCaptureAudioUrl: body.quickCaptureAudioUrl,
          quickCaptureStatus: body.quickCaptureStatus,
          quickCaptureExpandedNoteId: body.quickCaptureExpandedNoteId,
          sourceRecordingId: body.sourceRecordingId,
        })
        .returning(noteColumns);
      if (tagIds.length > 0) {
        await tx.insert(noteTags).values(tagIds.map((tagId) => ({ noteId: created.id, tagId })));
      }
      if (owner.id !== caller.id) {
        await tx.insert(noteCollaborators).values({
          noteId: created.id,
          userId: caller.id,
          role: "editor",
          addedBy: caller.id,
        });
      }
      return created;
    });

    res.status(201).json(await toResponse(note, tagIds));
  });

  // getNote
  router.get("/:id", async (req, res) => {
    const { note } = await requireNote(db, req.params.id, currentUser(res).id, "view");
    res.json(await toResponse(note));
  });

  // updateNote / renameNote / toggleArchiveNote / togglePinNote / toggleShareNote
  router.patch("/:id", async (req, res) => {
    const caller = currentUser(res);
    const body = parse(updateBody, req.body);
    const { version, tagIds, ...patch } = body;
    const { note, role } = await requireNote(db, req.params.id, caller.id, "edit");
    const ownerOnly = OWNER_FIELDS.filter((f) => body[f] !== undefined);
    if (ownerOnly.length > 0 && role !== "owner") {
      throw new HttpError(403, `Only the note's owner can change ${ownerOnly.join(", ")}`, "forbidden");
    }
    await checkRefs(note.userId, { ...patch, tagIds });

    const isContentSave = CONTENT_FIELDS.some((f) => patch[f] !== undefined);
    if (isContentSave && note.generationJobId) {
      // The worker is about to write this note's content; an edit now would be lost.
      throw new HttpError(409, "Notes are still being generated for this page", "note_generating");
    }
    const existingTagRows = await db
      .select({ tagId: noteTags.tagId })
      .from(noteTags)
      .where(eq(noteTags.noteId, note.id));
    const scheduleAutoTag = shouldScheduleAutoTag({
      content: patch.content,
      wordCount: patch.wordCount ?? note.wordCount ?? 0,
      tagIds,
      existingTagCount: existingTagRows.length,
      autoTagAttempted: note.autoTagAttempted,
    });
    // Pinning, archiving or sharing isn't using the note, so it doesn't count as opening it.
    const isEdit =
      tagIds !== undefined ||
      Object.keys(patch).some((f) => !OWNER_FIELDS.includes(f as (typeof OWNER_FIELDS)[number]));
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(notes)
        .set({
          ...patch,
          ...(scheduleAutoTag && { autoTagAttempted: true }),
          // Edits count as use, for stale-note cleanup.
          ...(isEdit && { lastAccessedAt: new Date() }),
          // Explicit, so a tags-only or empty patch still has something to set.
          updatedAt: new Date(),
          ...(isContentSave && { version: sql`${notes.version} + 1` }),
        })
        .where(and(eq(notes.id, note.id), isContentSave ? eq(notes.version, version!) : undefined))
        .returning(noteColumns);
      if (row && tagIds !== undefined) {
        await tx.delete(noteTags).where(eq(noteTags.noteId, note.id));
        const unique = [...new Set(tagIds)];
        if (unique.length > 0) {
          await tx.insert(noteTags).values(unique.map((tagId) => ({ noteId: note.id, tagId })));
        }
      }
      return row;
    });

    if (!updated) {
      // Someone else saved first. Send what's there now so the client can merge or reload.
      const { note: current } = await requireNote(db, note.id, caller.id, "view");
      res.status(409).json({
        error: { code: "version_conflict", message: "This note was changed by someone else" },
        note: await toResponse(current),
      });
      return;
    }
    if (scheduleAutoTag && process.env.GEMINI_API_KEY) {
      void autoTagNote(db, note.id, process.env.GEMINI_API_KEY);
    }
    res.json(await toResponse(updated));
  });

  // linkDocuments
  router.post("/:id/linked-files", async (req, res) => {
    const { fileIds } = parse(z.object({ fileIds: z.array(rowId).min(1).max(50) }), req.body);
    const { note } = await requireNote(db, req.params.id, currentUser(res).id, "own");
    const uniqueIds = [...new Set(fileIds)];
    const filesFound = await db
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.userId, note.userId), inArray(files.id, uniqueIds)));
    if (filesFound.length !== uniqueIds.length) {
      throw new HttpError(400, "Unknown file id", "invalid_request");
    }
    const existing = await db
      .select({ fileId: noteLinkedFiles.fileId })
      .from(noteLinkedFiles)
      .where(eq(noteLinkedFiles.noteId, note.id));
    const merged = [...new Set([...existing.map((r) => r.fileId), ...uniqueIds])];
    await db.delete(noteLinkedFiles).where(eq(noteLinkedFiles.noteId, note.id));
    if (merged.length > 0) {
      await db.insert(noteLinkedFiles).values(merged.map((fileId) => ({ noteId: note.id, fileId })));
    }
    res.json(merged);
  });

  // unlinkDocument
  router.delete("/:id/linked-files/:fileId", async (req, res) => {
    const { note } = await requireNote(db, req.params.id, currentUser(res).id, "own");
    await db
      .delete(noteLinkedFiles)
      .where(and(eq(noteLinkedFiles.noteId, note.id), eq(noteLinkedFiles.fileId, req.params.fileId)));
    const remaining = await db
      .select({ fileId: noteLinkedFiles.fileId })
      .from(noteLinkedFiles)
      .where(eq(noteLinkedFiles.noteId, note.id));
    res.json(remaining.map((r) => r.fileId));
  });

  // unassignNoteFromFolder
  router.post("/:id/unassign", async (req, res) => {
    const { note } = await requireNote(db, req.params.id, currentUser(res).id, "own");
    const [updated] = await db
      .update(notes)
      .set({ noteType: "quick", courseId: null, moduleId: null, parentNoteId: null })
      .where(eq(notes.id, note.id))
      .returning(noteColumns);
    res.json(await toResponse(updated));
  });

  // moveNoteToFolder: files the note in a course or module as a top-level page.
  router.post("/:id/move", async (req, res) => {
    const caller = currentUser(res);
    const body = parse(moveBody, req.body);
    const { note } = await requireNote(db, req.params.id, caller.id, "own");
    const { courseId, moduleId } = resolveFolder(caller.courses ?? [], body.courseId, body.moduleId);
    const [moved] = await db
      .update(notes)
      .set({ noteType: "page", courseId, moduleId: moduleId ?? null, parentNoteId: null })
      .where(eq(notes.id, note.id))
      .returning(noteColumns);
    res.json(await toResponse(moved));
  });

  // deleteNote. Collaborators, invites and tags go with it; sub-pages become top-level notes.
  router.delete("/:id", async (req, res) => {
    const { note } = await requireNote(db, req.params.id, currentUser(res).id, "own");
    await db.delete(notes).where(eq(notes.id, note.id));
    res.status(204).end();
  });

  // touchNote: call when a note is opened. Doesn't change its version.
  router.post("/:id/touch", async (req, res) => {
    const { note } = await requireNote(db, req.params.id, currentUser(res).id, "view");
    await db.update(notes).set({ lastAccessedAt: new Date() }).where(eq(notes.id, note.id));
    res.status(204).end();
  });

  return router;
}
