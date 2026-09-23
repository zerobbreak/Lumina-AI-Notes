"use client";

import { useQuery } from "@tanstack/react-query";
import { accountApi } from "@/lib/api/domains/account.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";

export function useUsage() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: userKeys.usage(),
    queryFn: async () => {
      const token = await getApiToken();
      return accountApi.getUsage(token);
    },
    enabled: isReady,
  });
}
