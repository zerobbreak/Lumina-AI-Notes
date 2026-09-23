"use client";

import { useQuery } from "@tanstack/react-query";
import { toChatContextNotes } from "@/lib/api/adapters/chat";
import { chatsApi } from "@/lib/api/domains/chats.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { chatKeys } from "@/lib/query-keys/chats";

export function useChatContextNotes(noteIds: string[], enabled = true) {
  const { getApiToken, isReady } = useApiToken();
  return useQuery({
    queryKey: chatKeys.contextNotes(noteIds),
    queryFn: async () => {
      const token = await getApiToken();
      return toChatContextNotes(await chatsApi.getContextNotes(token, noteIds));
    },
    enabled: isReady && enabled,
  });
}
