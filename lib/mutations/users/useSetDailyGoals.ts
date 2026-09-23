"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";
import type { SetDailyGoalsInput } from "@/types/api/account";

export function useSetDailyGoals() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: SetDailyGoalsInput) => {
      const token = await getApiToken();
      return usersApi.setDailyGoals(token, input);
    },
    onSuccess: (stats) => {
      queryClient.setQueryData(userKeys.gamification(), stats);
    },
  });
}
