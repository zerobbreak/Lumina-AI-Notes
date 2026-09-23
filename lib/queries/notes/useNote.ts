"use client";

import { useQuery } from "@tanstack/react-query";
import { toOpenNote } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function useNote(noteId: string | null | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteId ? noteKeys.detail(noteId) : noteKeys.all,
    queryFn: async () => {
      if (!noteId) throw new Error("Missing noteId");
      const token = await getApiToken();
      return toOpenNote(await notesApi.getById(token, noteId));
    },
    enabled: isRestApiEnabled() && isReady && Boolean(noteId),
  });
}
