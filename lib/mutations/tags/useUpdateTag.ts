"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api/domains/tags.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes, invalidateTags } from "@/lib/invalidation";

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({
      tagId,
      name,
      color,
    }: {
      tagId: string;
      name?: string;
      color?: string;
    }) => {
const token = await getApiToken();
      await tagsApi.update(token, tagId, { name, color });
    },
    onSuccess: () => {
      invalidateTags(queryClient);
      invalidateNotes(queryClient);
    },
  });
}
