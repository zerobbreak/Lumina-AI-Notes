"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { brightspaceApi } from "@/lib/api/domains/integrations.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { applyBrightspaceStatus } from "@/lib/invalidation";

export function useImportBrightspaceCourses() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getApiToken();
      return brightspaceApi.importCourses(token);
    },
    onSuccess: (response) => {
      applyBrightspaceStatus(queryClient, response);
    },
  });
}
