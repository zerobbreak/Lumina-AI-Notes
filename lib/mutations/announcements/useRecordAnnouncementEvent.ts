"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsApi } from "@/lib/api/domains/announcements.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { announcementKeys } from "@/lib/query-keys/announcements";
import type { AnnouncementEventDto, AnnouncementEventKind } from "@/types/api/announcements";

type Input = { announcementId: string; kind: AnnouncementEventKind };

/**
 * Adds the event to the cache straight away, so a dismissed card closes and
 * the unread dot clears without waiting on the API.
 */
export function useRecordAnnouncementEvent() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();
  const key = announcementKeys.events();

  return useMutation({
    mutationFn: async (input: Input) => {
      const token = await getApiToken();
      return announcementsApi.recordEvent(token, input);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AnnouncementEventDto[]>(key);
      const already = previous?.some(
        (e) => e.announcementId === input.announcementId && e.kind === input.kind,
      );
      if (!already) {
        queryClient.setQueryData<AnnouncementEventDto[]>(key, [
          ...(previous ?? []),
          { ...input, at: Date.now() },
        ]);
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
