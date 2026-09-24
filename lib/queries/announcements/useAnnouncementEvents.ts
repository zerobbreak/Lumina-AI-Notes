"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/lib/api/domains/announcements.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { announcementKeys } from "@/lib/query-keys/announcements";

/** Only this client writes these, so there is nothing to poll for. */
export function useAnnouncementEvents() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: announcementKeys.events(),
    queryFn: async () => {
      const token = await getApiToken();
      return announcementsApi.listEvents(token);
    },
    enabled: isReady,
    staleTime: Infinity,
  });
}
