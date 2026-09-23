"use client";

import { useQuery } from "@tanstack/react-query";
import { noteListItemToCard } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export function usePinnedNotes(enabled: boolean, limit = 20) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteKeys.pinned(limit),
    queryFn: async () => {
      const token = await getApiToken();
      const items = await notesApi.getPinned(token, limit);
      return items.map(noteListItemToCard);
    },
    enabled: isRestApiEnabled() && isReady && enabled,
  });
}
