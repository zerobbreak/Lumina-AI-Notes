"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";

export function useTogglePinNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      const note = await notesApi.getById(token, noteId);
      await notesApi.update(token, noteId, { isPinned: !note.isPinned });
    },
    onSuccess: () => {
      invalidateNotes(queryClient);
    },
  });
}
