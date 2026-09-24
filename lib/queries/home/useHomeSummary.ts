"use client";

import { useQuery } from "@tanstack/react-query";
import { homeApi } from "@/lib/api/domains/home.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { homeKeys } from "@/lib/query-keys/home";

/** Today's plan, the next two weeks of deadlines and each course's pulse. */
export function useHomeSummary() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: homeKeys.summary(),
    queryFn: async () => {
      const token = await getApiToken();
      return homeApi.getSummary(token, new Date().getTimezoneOffset());
    },
    enabled: isReady,
  });
}
