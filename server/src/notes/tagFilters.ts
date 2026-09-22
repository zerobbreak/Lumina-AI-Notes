import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { noteTags, notes } from "../db/schema/index.js";

/** Notes that carry every tag in tagIds (intersection). Scoped to the user's notes. */
export async function noteIdsWithAllTags(db: Db, userId: string, tagIds: string[]) {
  const rows = await db
    .select({ noteId: noteTags.noteId, tagId: noteTags.tagId })
    .from(noteTags)
    .innerJoin(notes, eq(notes.id, noteTags.noteId))
    .where(and(eq(notes.userId, userId), inArray(noteTags.tagId, tagIds)));

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.noteId, (counts.get(row.noteId) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count === tagIds.length).map(([noteId]) => noteId),
  );
}

/** Batch-load tag ids keyed by note id. */
export async function tagIdsByNoteIds(db: Db, noteIds: string[]) {
  const map = new Map<string, string[]>();
  if (noteIds.length === 0) return map;

  const rows = await db
    .select({ noteId: noteTags.noteId, tagId: noteTags.tagId })
    .from(noteTags)
    .where(inArray(noteTags.noteId, noteIds));

  for (const row of rows) {
    const list = map.get(row.noteId) ?? [];
    list.push(row.tagId);
    map.set(row.noteId, list);
  }
  return map;
}
