"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deadlinesApi } from "@/lib/api/domains/deadlines.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateDeadlines } from "@/lib/invalidation";

export function useCreateDeadline() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      dueAt: number;
      kind: "assignment" | "exam" | "event" | "task";
      courseId?: string;
      moduleId?: string;
      notes?: string;
    }) => {
const token = await getApiToken();
      return deadlinesApi.create(token, input);
    },
    onSuccess: () => {
      invalidateDeadlines(queryClient);
    },
  });
}
