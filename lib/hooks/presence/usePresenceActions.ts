"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { presenceApi } from "@/lib/api/domains/presence.api";
import { useApiToken } from "@/lib/api/use-api-token";

export function usePresenceActions() {
  const { getApiToken } = useApiToken();

  const heartbeat = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      const token = await getApiToken();
      await presenceApi.heartbeat(token, args.noteId);
    },
    [getApiToken],
  );

  const leave = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      const token = await getApiToken();
      await presenceApi.leave(token, args.noteId);
    },
    [getApiToken],
  );

  return { heartbeat, leave };
}
