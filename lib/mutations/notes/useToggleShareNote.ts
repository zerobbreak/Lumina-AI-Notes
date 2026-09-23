"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteDetailToEditor } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";
import { noteKeys } from "@/lib/query-keys/notes";
import type { NoteDetailDto } from "@/types/api/notes";

export function useToggleShareNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (noteId: string): Promise<NoteDetailDto> => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      const note = await notesApi.getById(token, noteId);
      return notesApi.update(token, noteId, { isShared: !note.isShared });
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(
        noteKeys.detail(dto.id),
        noteDetailToEditor(dto),
      );
      invalidateNotes(queryClient);
    },
  });
}
