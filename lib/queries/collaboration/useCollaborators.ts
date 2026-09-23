"use client";

import { useQuery } from "@tanstack/react-query";
import { collaborationApi } from "@/lib/api/domains/collaboration.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { pollWhileVisible, POLL_MS } from "@/lib/queries/polling";
import { collaborationKeys } from "@/lib/query-keys/collaboration";

export function useCollaborators(noteId: string | undefined, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: collaborationKeys.people(noteId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return collaborationApi.listPeopleWithAccess(token, noteId!);
    },
    enabled: isReady && enabled && !!noteId,
    ...(enabled ? pollWhileVisible(POLL_MS.collaborators) : {}),
  });
}
