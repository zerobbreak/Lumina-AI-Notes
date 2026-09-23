"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api/domains/tags.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes, invalidateTags } from "@/lib/invalidation";

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (tagId: string) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      await tagsApi.delete(token, tagId);
    },
    onSuccess: () => {
      invalidateTags(queryClient);
      invalidateNotes(queryClient);
    },
  });
}
