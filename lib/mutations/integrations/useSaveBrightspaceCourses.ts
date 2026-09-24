"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { brightspaceApi } from "@/lib/api/domains/integrations.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { applyBrightspaceStatus } from "@/lib/invalidation";

export function useSaveBrightspaceCourses() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (courses: Array<{ id: string; courseId: string | null; ignored: boolean }>) => {
      const token = await getApiToken();
      return brightspaceApi.saveCourses(token, courses);
    },
    onSuccess: (response) => {
      applyBrightspaceStatus(queryClient, response);
    },
  });
}
