"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/domains/notifications.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { notificationKeys } from "@/lib/query-keys/notifications";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async () => {
      if (!isRestApiEnabled()) throw new Error("REST API is not enabled");
      const token = await getApiToken();
      return notificationsApi.markAllRead(token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
