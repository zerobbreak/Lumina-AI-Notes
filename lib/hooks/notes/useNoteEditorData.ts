"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useChildNotes } from "@/lib/queries/notes/useChildNotes";
import { useNoteDetail } from "@/lib/queries/notes/useNoteDetail";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

export function useNoteEditorData(noteId: Id<"notes">) {
  const useRest = isRestApiEnabled();

  const noteConvex = useQuery(api.notes.getNote, useRest ? "skip" : { noteId });
  const noteRest = useNoteDetail(noteId);
  const noteQuery = useRest
    ? noteRest.isLoading
      ? undefined
      : noteRest.data
    : noteConvex;

  const parentId = noteQuery?.parentNoteId as Id<"notes"> | undefined;

  const parentConvex = useQuery(
    api.notes.getNote,
    !useRest && parentId ? { noteId: parentId } : "skip",
  );
  const parentRest = useNoteDetail(parentId);
  const parentNote = useRest ? (parentId ? parentRest.data : undefined) : parentConvex;

  const childConvex = useQuery(
    api.notes.getChildNotes,
    useRest ? "skip" : { parentNoteId: noteId },
  );
  const childRest = useChildNotes(noteId);
  const childNotes = useRest ? childRest.data : childConvex;

  const userConvex = useQuery(api.users.getUser, useRest ? "skip" : {});
  const userRest = useCurrentUser();
  const userData = useRest ? userRest.data : userConvex;

  return { noteQuery, parentNote, childNotes, userData };
}
