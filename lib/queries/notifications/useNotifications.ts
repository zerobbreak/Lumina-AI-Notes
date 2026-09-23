"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/domains/notifications.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { notificationKeys } from "@/lib/query-keys/notifications";

export function useNotifications(
  params?: { limit?: number; unreadOnly?: boolean },
  enabled = true,
) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const token = await getApiToken();
      return notificationsApi.list(token, params);
    },
    enabled: isRestApiEnabled() && isReady && enabled,
  });
}
