"use client";

import { useQuery } from "@tanstack/react-query";
import { toTagsWithCounts } from "@/lib/api/adapters/tag";
import { tagsApi } from "@/lib/api/domains/tags.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { tagKeys } from "@/lib/query-keys/tags";

export function useTagsWithCounts() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: tagKeys.withCounts(),
    queryFn: async () => {
      const token = await getApiToken();
      return toTagsWithCounts(await tagsApi.listWithCounts(token));
    },
    enabled: isRestApiEnabled() && isReady,
  });
}
