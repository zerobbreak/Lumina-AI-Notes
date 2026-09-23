"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "@/lib/api/domains/files.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateFiles } from "@/lib/invalidation";

export function useRenameFile() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ fileId, name }: { fileId: string; name: string }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      await filesApi.rename(token, fileId, name);
    },
    onSuccess: () => {
      invalidateFiles(queryClient);
    },
  });
}
