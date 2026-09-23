"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";

export type CreateNoteInput = {
  title: string;
  major?: string;
  courseId?: string;
  moduleId?: string;
  parentNoteId?: string;
  noteType?: string;
  style?: string;
  sourceRecordingId?: string;
};

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      const note = await notesApi.create(token, input);
      return note.id;
    },
    onSuccess: () => {
      invalidateNotes(queryClient);
    },
  });
}
