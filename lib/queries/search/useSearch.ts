"use client";

import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api/domains/search.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { searchKeys } from "@/lib/query-keys/search";

export function useSearch(
  params: {
    query: string;
    type?: "note" | "file" | "deck" | "all";
    courseId?: string;
    tagIds?: string[];
  },
  enabled = true,
) {
  const { getApiToken, isReady } = useApiToken();
  const trimmed = params.query.trim();

  return useQuery({
    queryKey: searchKeys.query({ ...params, query: trimmed }),
    queryFn: async () => {
      const token = await getApiToken();
      return searchApi.search(token, { ...params, query: trimmed });
    },
    enabled: isRestApiEnabled() && isReady && enabled && trimmed.length > 0,
  });
}
