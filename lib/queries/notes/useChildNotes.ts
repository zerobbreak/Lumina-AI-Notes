"use client";

import { useQuery } from "@tanstack/react-query";
import { noteListItemToChildNote } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function useChildNotes(parentNoteId: string | null | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: parentNoteId ? noteKeys.children(parentNoteId) : noteKeys.all,
    queryFn: async () => {
      if (!parentNoteId) throw new Error("Missing parentNoteId");
      const token = await getApiToken();
      const rows = await notesApi.getChildNotes(token, parentNoteId);
      return rows.map(noteListItemToChildNote);
    },
    enabled: isRestApiEnabled() && isReady && Boolean(parentNoteId),
  });
}
