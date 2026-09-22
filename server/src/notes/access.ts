import { and, eq, exists, getTableColumns, or } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { noteCollaborators, notes } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";

export type NoteRole = "owner" | "editor" | "viewer";

/** What a caller needs to do with a note, weakest first. */
export type NoteAccess = "view" | "edit" | "own";

const allowed: Record<NoteAccess, NoteRole[]> = {
  view: ["owner", "editor", "viewer"],
  edit: ["owner", "editor"],
  own: ["owner"],
};

// Never sent to clients: vectors are large and only used server-side, and the
// search columns are generated copies of title and content.
const { embedding: _embedding, searchTitle: _searchTitle, searchContent: _searchContent, ...noteColumns } =
  getTableColumns(notes);
export { noteColumns };

/** SQL condition: the user owns the note or collaborates on it. For list queries. */
export function canView(db: Db, userId: string) {
  return or(
    eq(notes.userId, userId),
    exists(
      db
        .select()
        .from(noteCollaborators)
        .where(and(eq(noteCollaborators.noteId, notes.id), eq(noteCollaborators.userId, userId))),
    ),
  )!;
}

/**
 * Loads a note with the caller's role on it: owner, or their collaborator
 * role. Port of Convex's getNoteRole + requireNoteAccess/Edit/Owner.
 *
 * A note the caller can't see at all is a 404, so ids of other people's notes
 * don't leak. Seeing it but lacking the role is a 403.
 */
export async function requireNote(db: Db, noteId: string, userId: string, access: NoteAccess) {
  const [row] = await db
    .select({ note: noteColumns, collaboratorRole: noteCollaborators.role })
    .from(notes)
    .leftJoin(
      noteCollaborators,
      and(eq(noteCollaborators.noteId, notes.id), eq(noteCollaborators.userId, userId)),
    )
    .where(eq(notes.id, noteId))
    .limit(1);

  const role: NoteRole | null = !row
    ? null
    : row.note.userId === userId
      ? "owner"
      : (row.collaboratorRole ?? null);
  if (!row || !role) {
    throw new HttpError(404, "Note not found", "not_found");
  }
  if (!allowed[access].includes(role)) {
    throw new HttpError(403, "You don't have permission to do that to this note", "forbidden");
  }
  return { note: row.note, role };
}
