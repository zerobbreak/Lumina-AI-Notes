"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsApi } from "@/lib/api/domains/announcements.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { announcementKeys } from "@/lib/query-keys/announcements";

/** Dev tool: forget every announcement event, so they all show again. */
export function useResetAnnouncementEvents() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getApiToken();
      return announcementsApi.resetEvents(token);
    },
    onSuccess: () => {
      queryClient.setQueryData(announcementKeys.events(), []);
    },
  });
}
