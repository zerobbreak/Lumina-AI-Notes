"use client";

import { useQuery } from "@tanstack/react-query";
import { noteDetailToEditor } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { ApiError } from "@/lib/api/errors";
import { useApiToken } from "@/lib/api/use-api-token";
import { editorQueryOptions } from "@/lib/queries/polling";
import { noteKeys } from "@/lib/query-keys/notes";

/**
 * The one query behind `noteKeys.detail`. Every hook reading that key must use
 * it, so the cache always holds the full editor model; hooks that need less
 * narrow it with `select` rather than caching a slimmer shape under the same key.
 */
export function useNoteDetailQueryOptions(noteId: string | null | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return {
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
    enabled: isReady && Boolean(noteId),
    ...editorQueryOptions(),
  };
}

export function useNoteDetail(noteId: string | null | undefined) {
  return useQuery(useNoteDetailQueryOptions(noteId));
}
