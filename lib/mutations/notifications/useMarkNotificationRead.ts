"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/domains/notifications.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { notificationKeys } from "@/lib/query-keys/notifications";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getApiToken();
      return notificationsApi.markRead(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
