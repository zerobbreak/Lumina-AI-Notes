"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes, invalidateUser } from "@/lib/invalidation";

export function useDeleteModule() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
    }: {
      courseId: string;
      moduleId: string;
    }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      await coursesApi.deleteModule(token, courseId, moduleId);
    },
    onSuccess: () => {
      invalidateUser(queryClient);
      invalidateNotes(queryClient);
    },
  });
}
