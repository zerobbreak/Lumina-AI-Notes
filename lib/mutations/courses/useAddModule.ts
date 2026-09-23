"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes, invalidateUser } from "@/lib/invalidation";

export function useAddModule() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ courseId, title }: { courseId: string; title: string }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      return coursesApi.addModule(token, courseId, { title });
    },
    onSuccess: () => {
      invalidateUser(queryClient);
      invalidateNotes(queryClient);
    },
  });
}
