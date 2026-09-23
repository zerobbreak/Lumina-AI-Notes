"use client";

import type { Id } from "@/types/data-model";
import { useChildNotes } from "@/lib/queries/notes/useChildNotes";
import { useNoteDetail } from "@/lib/queries/notes/useNoteDetail";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

export function useNoteEditorData(noteId: Id<"notes">) {
  const noteRest = useNoteDetail(noteId);
  const noteQuery = noteRest.isLoading ? undefined : noteRest.data;

  const parentId = noteQuery?.parentNoteId as Id<"notes"> | undefined;

  const parentRest = useNoteDetail(parentId);
  const parentNote = parentId ? parentRest.data : undefined;

  const childRest = useChildNotes(noteId);
  const childNotes = childRest.data;

  const userRest = useCurrentUser();
  const userData = userRest.data;

  return { noteQuery, parentNote, childNotes, userData };
}
