"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toUserData } from "@/lib/api/adapters/user";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";
import type { UpdateAppearanceInput } from "@/types/api/user";

/**
 * Saves part of the look. The caller has already applied it; the response
 * replaces the cached user rather than refetching.
 *
 * Any user fetch still in flight is cancelled first: the server may have
 * answered it before this save, and on a slow API it would land afterwards
 * and put the old look back.
 */
export function useUpdateAppearance() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: UpdateAppearanceInput) => {
      const token = await getApiToken();
      return usersApi.updateAppearance(token, input);
    },
    onSuccess: async (dto) => {
      await queryClient.cancelQueries({ queryKey: userKeys.me() });
      queryClient.setQueryData(userKeys.me(), toUserData(dto));
    },
  });
}
