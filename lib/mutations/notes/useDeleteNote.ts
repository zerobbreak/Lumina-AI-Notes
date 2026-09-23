"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (noteId: string) => {
const token = await getApiToken();
      await notesApi.delete(token, noteId);
    },
    onSuccess: () => {
      invalidateNotes(queryClient);
    },
  });
}
