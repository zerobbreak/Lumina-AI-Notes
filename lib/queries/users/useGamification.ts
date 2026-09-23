"use client";

import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";

export function useGamification() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: userKeys.gamification(),
    queryFn: async () => {
      const token = await getApiToken();
      return usersApi.getGamification(token);
    },
    enabled: isReady,
  });
}
