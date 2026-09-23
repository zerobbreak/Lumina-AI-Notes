"use client";

import { useQuery } from "@tanstack/react-query";
import { toDeadlines } from "@/lib/api/adapters/deadline";
import { deadlinesApi } from "@/lib/api/domains/deadlines.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { deadlineKeys } from "@/lib/query-keys/deadlines";

export function useUpcomingDeadlines(
  params?: { limit?: number; windowDays?: number; includeCompleted?: boolean },
  enabled = true,
) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: deadlineKeys.upcoming(params),
    queryFn: async () => {
      const token = await getApiToken();
      return toDeadlines(await deadlinesApi.getUpcoming(token, params));
    },
    enabled: isReady && enabled,
  });
}
