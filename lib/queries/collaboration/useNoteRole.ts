"use client";

import { useQuery } from "@tanstack/react-query";
import { collaborationApi } from "@/lib/api/domains/collaboration.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { pollWhileVisible, POLL_MS } from "@/lib/queries/polling";
import { collaborationKeys } from "@/lib/query-keys/collaboration";

/**
 * The signed-in user's role on a note: owner, editor or viewer. Polled like
 * the collaborator list, so a role change by the owner reaches an open note.
 */
export function useNoteRole(noteId: string | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: collaborationKeys.access(noteId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return (await collaborationApi.getNoteAccess(token, noteId!)).role;
    },
    enabled: isReady && !!noteId,
    ...pollWhileVisible(POLL_MS.collaborators),
  });
}
