"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "@/lib/api/domains/files.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateFiles } from "@/lib/invalidation";

export function useRetryFileProcessing() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (fileId: string) => {
const token = await getApiToken();
      await filesApi.retryProcessing(token, fileId);
    },
    onSuccess: () => {
      invalidateFiles(queryClient);
    },
  });
}
