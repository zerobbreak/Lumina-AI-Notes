"use client";

import { useQuery } from "@tanstack/react-query";
import { toOpenNote } from "@/lib/api/adapters/note";
import { useNoteDetailQueryOptions } from "@/lib/queries/notes/useNoteDetail";

/** The open note's placement (course, module, parent) for the sidebar and palette. */
export function useNote(noteId: string | null | undefined) {
  return useQuery({
    ...useNoteDetailQueryOptions(noteId),
    select: (note) => (note ? toOpenNote(note) : note),
  });
}
