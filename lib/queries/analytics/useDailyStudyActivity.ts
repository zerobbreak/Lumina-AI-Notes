"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/domains/analytics.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { analyticsKeys } from "@/lib/query-keys/analytics";

export function useDailyStudyActivity(
  params: { start: number; end: number; tzOffsetMinutes: number } | null,
) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: params ? analyticsKeys.dailyStudyActivity(params) : analyticsKeys.all,
    queryFn: async () => {
      if (!params) throw new Error("Missing params");
      const token = await getApiToken();
      return analyticsApi.getDailyStudyActivity(token, params);
    },
    enabled: isRestApiEnabled() && isReady && params !== null,
  });
}
