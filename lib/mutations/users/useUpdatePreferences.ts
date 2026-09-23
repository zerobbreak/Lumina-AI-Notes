"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/domains/users.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateUser } from "@/lib/invalidation";
import type { UpdatePreferencesInput } from "@/types/api/user";

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      return usersApi.updatePreferences(token, input);
    },
    onSuccess: () => {
      invalidateUser(queryClient);
    },
  });
}
