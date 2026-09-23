"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api/domains/tags.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateTags } from "@/lib/invalidation";

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      return tagsApi.create(token, { name, color });
    },
    onSuccess: () => {
      invalidateTags(queryClient);
    },
  });
}
