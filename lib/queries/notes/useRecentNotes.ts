"use client";

import { useQuery } from "@tanstack/react-query";
import { noteListItemToCard } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function useRecentNotes(limit = 5) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteKeys.recent(limit),
    queryFn: async () => {
      const token = await getApiToken();
      const items = await notesApi.getRecent(token, limit);
      return items.map(noteListItemToCard);
    },
    enabled: isRestApiEnabled() && isReady,
  });
}
