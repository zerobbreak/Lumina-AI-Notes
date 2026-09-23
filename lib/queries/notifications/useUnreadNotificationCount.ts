"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/domains/notifications.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { notificationKeys } from "@/lib/query-keys/notifications";

export function useUnreadNotificationCount(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const token = await getApiToken();
      return notificationsApi.unreadCount(token);
    },
    enabled: isRestApiEnabled() && isReady && enabled,
    refetchInterval: 60_000,
  });
}
