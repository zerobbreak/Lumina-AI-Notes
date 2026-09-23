"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/domains/analytics.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { analyticsKeys } from "@/lib/query-keys/analytics";

export function useBurnoutStats(tzOffsetMinutes: number, enabled: boolean) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: analyticsKeys.burnoutStats(tzOffsetMinutes),
    queryFn: async () => {
      const token = await getApiToken();
      return analyticsApi.getBurnoutStats(token, tzOffsetMinutes);
    },
    enabled: isReady && enabled,
  });
}
