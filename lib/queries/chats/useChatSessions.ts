"use client";

import { useQuery } from "@tanstack/react-query";
import { toChatSessions } from "@/lib/api/adapters/chat";
import { chatsApi } from "@/lib/api/domains/chats.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { pollWhileVisible, POLL_MS, STALE_MS } from "@/lib/queries/polling";
import { chatKeys } from "@/lib/query-keys/chats";

export function useChatSessions(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: chatKeys.sessions(),
    queryFn: async () => {
      const token = await getApiToken();
      return toChatSessions(await chatsApi.listSessions(token));
    },
    enabled: isReady && enabled,
    staleTime: STALE_MS.chat,
    ...pollWhileVisible(POLL_MS.chatSessions),
  });
}
