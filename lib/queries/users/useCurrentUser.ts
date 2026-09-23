"use client";

import { useQuery } from "@tanstack/react-query";
import { toUserData } from "@/lib/api/adapters/user";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";

export function useCurrentUser() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      const token = await getApiToken();
      return toUserData(await usersApi.getMe(token));
    },
    enabled: isReady,
  });
}
