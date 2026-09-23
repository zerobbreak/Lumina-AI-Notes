"use client";

import { useQuery } from "@tanstack/react-query";
import { toChatSession } from "@/lib/api/adapters/chat";
import { chatsApi } from "@/lib/api/domains/chats.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { STALE_MS } from "@/lib/queries/polling";
import { chatKeys } from "@/lib/query-keys/chats";

export function useChatSession(sessionId: string | null, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: chatKeys.session(sessionId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      const row = await chatsApi.getSession(token, sessionId!);
      return row ? toChatSession(row) : null;
    },
    enabled: isReady && enabled && Boolean(sessionId),
    staleTime: STALE_MS.chat,
  });
}
