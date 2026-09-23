"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes, invalidateUser } from "@/lib/invalidation";

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (courseId: string) => {
const token = await getApiToken();
      await coursesApi.delete(token, courseId);
    },
    onSuccess: () => {
      invalidateUser(queryClient);
      invalidateNotes(queryClient);
    },
  });
}
