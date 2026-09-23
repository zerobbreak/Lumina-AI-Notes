"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/domains/analytics.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { analyticsKeys } from "@/lib/query-keys/analytics";

export function useReadinessForecast(deckId: string | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: deckId ? analyticsKeys.readinessForecast(deckId) : analyticsKeys.all,
    queryFn: async () => {
      if (!deckId) throw new Error("Missing deckId");
      const token = await getApiToken();
      return analyticsApi.getReadinessForecast(token, deckId);
    },
    enabled: isRestApiEnabled() && isReady && Boolean(deckId),
  });
}
