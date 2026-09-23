"use client";

import type { Id } from "@/types/data-model";
import { usePublicNote } from "@/lib/queries/public/usePublicNote";

export function usePublicNoteData(noteId: Id<"notes">) {
  const noteRest = usePublicNote(noteId);

  if (noteRest.isLoading) return undefined;
  return noteRest.data;
}
