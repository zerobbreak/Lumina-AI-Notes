"use client";

import { useQuery } from "@tanstack/react-query";
import { noteListItemsToSidebar } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function useQuickNotes(limit = 10) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteKeys.quick(limit),
    queryFn: async () => {
      const token = await getApiToken();
      return noteListItemsToSidebar(await notesApi.getQuick(token, limit));
    },
    enabled: isReady,
  });
}
