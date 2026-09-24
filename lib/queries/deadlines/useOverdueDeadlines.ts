"use client";

import { useQuery } from "@tanstack/react-query";
import { toDeadlines } from "@/lib/api/adapters/deadline";
import { deadlinesApi } from "@/lib/api/domains/deadlines.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { deadlineKeys } from "@/lib/query-keys/deadlines";

/** Unfinished deadlines that have passed, most recent first. */
export function useOverdueDeadlines(params?: { limit?: number; windowDays?: number }, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: deadlineKeys.overdue(params),
    queryFn: async () => {
      const token = await getApiToken();
      return toDeadlines(await deadlinesApi.getOverdue(token, params));
    },
    enabled: isReady && enabled,
  });
}
