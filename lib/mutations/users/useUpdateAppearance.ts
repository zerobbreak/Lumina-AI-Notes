"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toUserData } from "@/lib/api/adapters/user";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";
import type { UpdateAppearanceInput } from "@/types/api/user";

/**
 * Saves part of the look. The caller has already applied it; the response
 * replaces the cached user rather than refetching, so a slow refetch can't
 * briefly undo a change made since.
 */
export function useUpdateAppearance() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: UpdateAppearanceInput) => {
      const token = await getApiToken();
      return usersApi.updateAppearance(token, input);
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(userKeys.me(), toUserData(dto));
    },
  });
}
