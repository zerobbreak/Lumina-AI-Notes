"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "@/lib/api/domains/files.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateFiles } from "@/lib/invalidation";
import type { CreateFileBody } from "@/types/api/files";

export function useCreateFile() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (body: CreateFileBody) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      return filesApi.create(token, body);
    },
    onSuccess: () => {
      invalidateFiles(queryClient);
    },
  });
}
