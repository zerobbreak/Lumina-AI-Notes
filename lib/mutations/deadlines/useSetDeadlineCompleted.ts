"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deadlinesApi } from "@/lib/api/domains/deadlines.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateDeadlines } from "@/lib/invalidation";

export function useSetDeadlineCompleted() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const token = await getApiToken();
      return deadlinesApi.setCompleted(token, id, completed);
    },
    onSuccess: () => {
      invalidateDeadlines(queryClient);
    },
  });
}
