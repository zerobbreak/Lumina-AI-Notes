"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "@/lib/api/domains/files.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateFiles } from "@/lib/invalidation";
import type { CreateFileBody } from "@/types/api/files";

export function useCreateFile() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (body: CreateFileBody) => {
const token = await getApiToken();
      return filesApi.create(token, body);
    },
    onSuccess: () => {
      invalidateFiles(queryClient);
    },
  });
}
