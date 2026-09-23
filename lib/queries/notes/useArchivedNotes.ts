"use client";

import { useQuery } from "@tanstack/react-query";
import { noteListItemsToSidebar } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function useArchivedNotes() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteKeys.archived(),
    queryFn: async () => {
      const token = await getApiToken();
      return noteListItemsToSidebar(await notesApi.getArchived(token));
    },
    enabled: isReady,
  });
}
