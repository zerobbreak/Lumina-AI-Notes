"use client";

import { useQuery } from "@tanstack/react-query";
import { presenceApi } from "@/lib/api/domains/presence.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { pollWhileVisible, POLL_MS } from "@/lib/queries/polling";
import { presenceKeys } from "@/lib/query-keys/presence";

export function usePresenceViewers(noteId: string | undefined, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: presenceKeys.viewers(noteId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return presenceApi.getViewers(token, noteId!);
    },
    enabled: isReady && enabled && !!noteId,
    ...pollWhileVisible(POLL_MS.presence),
  });
}
