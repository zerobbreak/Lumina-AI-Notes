"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";

export function useRenameNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ noteId, title }: { noteId: string; title: string }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      await notesApi.update(token, noteId, { title });
    },
    onSuccess: () => {
      invalidateNotes(queryClient);
    },
  });
}
