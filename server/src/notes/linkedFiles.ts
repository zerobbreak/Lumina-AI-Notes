import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { noteLinkedFiles } from "../db/schema/index.js";

/** Convex field name kept for client compatibility. */
export async function linkedDocumentIdsOf(db: Db, noteId: string) {
  const rows = await db
    .select({ fileId: noteLinkedFiles.fileId })
    .from(noteLinkedFiles)
    .where(eq(noteLinkedFiles.noteId, noteId));
  return rows.map((r) => r.fileId);
}

export async function linkedDocumentIdsByNoteIds(db: Db, noteIds: string[]) {
  if (noteIds.length === 0) return new Map<string, string[]>();

  const rows = await db
    .select({ noteId: noteLinkedFiles.noteId, fileId: noteLinkedFiles.fileId })
    .from(noteLinkedFiles)
    .where(inArray(noteLinkedFiles.noteId, noteIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.noteId) ?? [];
    list.push(row.fileId);
    map.set(row.noteId, list);
  }
  return map;
}

export function withLinkedDocumentIds<T extends { id: string }>(
  items: T[],
  linkedByNoteId: Map<string, string[]>,
) {
  return items.map((item) => ({
    ...item,
    linkedDocumentIds: linkedByNoteId.get(item.id) ?? [],
  }));
}
