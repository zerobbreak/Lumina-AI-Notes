"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import type { ChatSessionModel } from "@/lib/api/adapters/chat";
import { chatsApi } from "@/lib/api/domains/chats.api";
import type { ChatModeDto } from "@/types/api/chats";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateChats, refreshChats } from "@/lib/invalidation";
import { chatKeys } from "@/lib/query-keys/chats";

type ChatMode = ChatModeDto;

export function useChatActions() {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateChats(queryClient);
  }, [queryClient]);

  const createSession = useCallback(
    async (args: { title: string }) => {
      const token = await getApiToken();
      const { id } = await chatsApi.createSession(token, args.title);
      // Wait for the refetch so callers that select the new chat see it in the
      // sessions list straight away, instead of a stale list without it.
      await refreshChats(queryClient);
      return id as Id<"chatSessions">;
    },
    [getApiToken, queryClient],
  );

  const sendMessage = useCallback(
    async (args: {
      sessionId: Id<"chatSessions">;
      role: "user" | "assistant";
      content: string;
      contextNoteIds?: Id<"notes">[];
    }) => {
      const token = await getApiToken();
      await chatsApi.sendMessage(token, args.sessionId, {
        role: args.role,
        content: args.content,
        contextNoteIds: args.contextNoteIds,
      });
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const deleteSession = useCallback(
    async (args: { sessionId: Id<"chatSessions"> }) => {
      // Drop the chat from the list straight away. An in-flight poll could put
      // it back, so cancel that first. If the delete fails, the refetch below
      // brings it back.
      await queryClient.cancelQueries({ queryKey: chatKeys.sessions() });
      queryClient.setQueryData<ChatSessionModel[]>(chatKeys.sessions(), (old) =>
        old?.filter((s) => s._id !== args.sessionId),
      );
      try {
        const token = await getApiToken();
        await chatsApi.deleteSession(token, args.sessionId);
      } finally {
        await refreshChats(queryClient);
      }
    },
    [getApiToken, queryClient],
  );

  const pinNotesToSession = useCallback(
    async (args: { sessionId: Id<"chatSessions">; noteIds: Id<"notes">[] }) => {
      const token = await getApiToken();
      await chatsApi.pinNotes(token, args.sessionId, args.noteIds);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const unpinNoteFromSession = useCallback(
    async (args: { sessionId: Id<"chatSessions">; noteId: Id<"notes"> }) => {
      const token = await getApiToken();
      await chatsApi.unpinNote(token, args.sessionId, args.noteId);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const setSessionMode = useCallback(
    async (args: { sessionId: Id<"chatSessions">; mode: ChatMode }) => {
      const token = await getApiToken();
      await chatsApi.setMode(token, args.sessionId, args.mode);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const generateAssistantReply = useCallback(
    async (args: {
      sessionId: Id<"chatSessions">;
      question: string;
      contextNoteIds?: Id<"notes">[];
    }) => {
      const token = await getApiToken();
      const result = await chatsApi.generateReply(token, args.sessionId, {
        question: args.question,
        contextNoteIds: args.contextNoteIds,
      });
      invalidate();
      return result;
    },
    [getApiToken, invalidate],
  );

  return {
    createSession,
    sendMessage,
    deleteSession,
    pinNotesToSession,
    unpinNoteFromSession,
    setSessionMode,
    generateAssistantReply,
  };
}
