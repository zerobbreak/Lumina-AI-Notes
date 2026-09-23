"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toUserData } from "@/lib/api/adapters/user";
import { usersApi } from "@/lib/api/domains/users.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";
import type { UpdateTourProgressInput } from "@/types/api/user";

export function useUpdateTourProgress() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: UpdateTourProgressInput) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      return toUserData(await usersApi.updateTourProgress(token, input));
    },
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.me(), user);
    },
  });
}
