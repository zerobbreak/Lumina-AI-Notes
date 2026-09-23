"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toUserData } from "@/lib/api/adapters/user";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateUser } from "@/lib/invalidation";
import type { CompleteOnboardingInput } from "@/types/api/user";

export function useCompleteOnboarding() {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  return useCallback(
    async (args: CompleteOnboardingInput) => {
      const token = await getApiToken();
      const user = toUserData(await usersApi.completeOnboarding(token, args));
      invalidateUser(queryClient);
      return user;
    },
    [getApiToken, queryClient],
  );
}
