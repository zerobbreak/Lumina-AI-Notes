"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { userKeys } from "@/lib/query-keys/users";

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: { name: string; code: string }) => {
      if (!isRestApiEnabled()) {
        throw new Error("REST API is not enabled");
      }
      const token = await getApiToken();
      return coursesApi.create(token, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}
