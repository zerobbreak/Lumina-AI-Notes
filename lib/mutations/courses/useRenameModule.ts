"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateUser } from "@/lib/invalidation";

export function useRenameModule() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      title,
    }: {
      courseId: string;
      moduleId: string;
      title: string;
    }) => {
const token = await getApiToken();
      await coursesApi.renameModule(token, courseId, moduleId, { title });
    },
    onSuccess: () => {
      invalidateUser(queryClient);
    },
  });
}
