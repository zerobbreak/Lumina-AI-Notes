"use client";

import { useQuery } from "@tanstack/react-query";
import { toDeadlines } from "@/lib/api/adapters/deadline";
import { deadlinesApi } from "@/lib/api/domains/deadlines.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { deadlineKeys } from "@/lib/query-keys/deadlines";

/** Every deadline due between startMs and endMs (at most ~6 weeks), done ones included. */
export function useDeadlinesInRange(params: { startMs: number; endMs: number }) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: deadlineKeys.range(params),
    queryFn: async () => {
      const token = await getApiToken();
      return toDeadlines(await deadlinesApi.getRange(token, params));
    },
    enabled: isReady,
  });
}
