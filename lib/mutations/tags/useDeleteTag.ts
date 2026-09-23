"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api/domains/tags.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes, invalidateTags } from "@/lib/invalidation";

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (tagId: string) => {
const token = await getApiToken();
      await tagsApi.delete(token, tagId);
    },
    onSuccess: () => {
      invalidateTags(queryClient);
      invalidateNotes(queryClient);
    },
  });
}
