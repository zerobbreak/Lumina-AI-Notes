"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";

export function useRenameNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ noteId, title }: { noteId: string; title: string }) => {
const token = await getApiToken();
      await notesApi.update(token, noteId, { title });
    },
    onSuccess: () => {
      invalidateNotes(queryClient);
    },
  });
}
