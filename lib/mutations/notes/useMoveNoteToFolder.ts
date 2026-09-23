"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";

export function useMoveNoteToFolder() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({
      noteId,
      courseId,
      moduleId,
    }: {
      noteId: string;
      courseId?: string;
      moduleId?: string;
    }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      await notesApi.move(token, noteId, { courseId, moduleId });
    },
    onSuccess: () => {
      invalidateNotes(queryClient);
    },
  });
}
