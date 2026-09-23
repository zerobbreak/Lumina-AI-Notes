"use client";

import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api/domains/search.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { searchKeys } from "@/lib/query-keys/search";

export function useSearchNoteContent(query: string, limit = 6, enabled = true) {
  const { getApiToken, isReady } = useApiToken();
  const trimmed = query.trim();

  return useQuery({
    queryKey: searchKeys.noteContent(trimmed, limit),
    queryFn: async () => {
      const token = await getApiToken();
      return searchApi.searchNoteContent(token, trimmed, limit);
    },
    enabled: isReady && enabled && trimmed.length >= 2,
  });
}
