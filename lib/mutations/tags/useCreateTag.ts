"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api/domains/tags.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateTags } from "@/lib/invalidation";

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
const token = await getApiToken();
      return tagsApi.create(token, { name, color });
    },
    onSuccess: () => {
      invalidateTags(queryClient);
    },
  });
}
