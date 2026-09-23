"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
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
  return noteDetailQueryOptions(noteId, getApiToken, isReady);
}

function noteDetailQueryOptions(
  noteId: string | null | undefined,
  getApiToken: () => Promise<string>,
  isReady: boolean,
) {
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

/**
 * Loads a note into the cache ahead of opening it, e.g. when the pointer rests
 * on its sidebar row. A note already cached and still fresh isn't refetched.
 */
export function usePrefetchNote() {
  const queryClient = useQueryClient();
  const { getApiToken, isReady } = useApiToken();

  return useCallback(
    (noteId: string) => {
      if (!isReady) return;
      void queryClient.prefetchQuery(noteDetailQueryOptions(noteId, getApiToken, isReady));
    },
    [queryClient, getApiToken, isReady],
  );
}
