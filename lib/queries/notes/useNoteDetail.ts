"use client";

import { useQuery } from "@tanstack/react-query";
import { noteDetailToEditor } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { ApiError } from "@/lib/api/errors";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function useNoteDetail(noteId: string | null | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteId ? noteKeys.detail(noteId) : noteKeys.all,
    queryFn: async () => {
      if (!noteId) throw new Error("Missing noteId");
      const token = await getApiToken();
      try {
        return noteDetailToEditor(await notesApi.getById(token, noteId));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: isRestApiEnabled() && isReady && Boolean(noteId),
  });
}
