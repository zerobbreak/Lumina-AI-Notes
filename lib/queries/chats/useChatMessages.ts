"use client";

import { useQuery } from "@tanstack/react-query";
import { toChatMessages } from "@/lib/api/adapters/chat";
import { chatsApi } from "@/lib/api/domains/chats.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { pollWhileVisible, POLL_MS, STALE_MS } from "@/lib/queries/polling";
import { chatKeys } from "@/lib/query-keys/chats";

export function useChatMessages(sessionId: string | null, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: chatKeys.messages(sessionId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return toChatMessages(await chatsApi.listMessages(token, sessionId!));
    },
    enabled: isReady && enabled && Boolean(sessionId),
    staleTime: STALE_MS.chat,
    ...pollWhileVisible(POLL_MS.chatMessages),
  });
}
