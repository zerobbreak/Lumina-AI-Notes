import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type {
  AssistantReplyDto,
  ChatContextNoteDto,
  ChatMessageDto,
  ChatModeDto,
  ChatSessionDto,
} from "@/types/api/chats";

export const chatsApi = {
  listSessions(token: string) {
    return apiFetch<ChatSessionDto[]>(apiPath`/chats/sessions`, { token });
  },

  getSession(token: string, sessionId: string) {
    return apiFetch<ChatSessionDto | null>(
      apiPath`/chats/sessions/${sessionId}`,
      { token },
    );
  },

  createSession(token: string, title: string) {
    return apiFetch<{ id: string }>(apiPath`/chats/sessions`, {
      method: "POST",
      token,
      body: { title },
    });
  },

  setMode(token: string, sessionId: string, mode: ChatModeDto) {
    return apiFetch<{ updated: boolean }>(
      apiPath`/chats/sessions/${sessionId}/mode`,
      { method: "PATCH", token, body: { mode } },
    );
  },

  updateTitle(token: string, sessionId: string, title: string) {
    return apiFetch<{ updated: boolean }>(
      apiPath`/chats/sessions/${sessionId}/title`,
      { method: "PATCH", token, body: { title } },
    );
  },

  pinNotes(token: string, sessionId: string, noteIds: string[]) {
    return apiFetch<{ pinned: boolean }>(
      apiPath`/chats/sessions/${sessionId}/pin`,
      { method: "POST", token, body: { noteIds } },
    );
  },

  unpinNote(token: string, sessionId: string, noteId: string) {
    return apiFetch<{ unpinned: boolean }>(
      apiPath`/chats/sessions/${sessionId}/pin/${noteId}`,
      { method: "DELETE", token },
    );
  },

  listMessages(token: string, sessionId: string) {
    return apiFetch<ChatMessageDto[]>(
      apiPath`/chats/sessions/${sessionId}/messages`,
      { token },
    );
  },

  sendMessage(
    token: string,
    sessionId: string,
    body: {
      role: "user" | "assistant";
      content: string;
      contextNoteIds?: string[];
    },
  ) {
    return apiFetch<{ id: string }>(
      apiPath`/chats/sessions/${sessionId}/messages`,
      { method: "POST", token, body },
    );
  },

  getContextNotes(token: string, noteIds: string[]) {
    return apiFetch<ChatContextNoteDto[]>(apiPath`/chats/context-notes`, {
      method: "POST",
      token,
      body: { noteIds },
    });
  },

  generateReply(
    token: string,
    sessionId: string,
    body: { question: string; contextNoteIds?: string[] },
  ) {
    return apiFetch<AssistantReplyDto>(
      apiPath`/chats/sessions/${sessionId}/reply`,
      { method: "POST", token, body },
    );
  },

  deleteAllSessions(token: string) {
    return apiFetch<{ deleted: number }>(apiPath`/chats/sessions`, { method: "DELETE", token });
  },

  deleteSession(token: string, sessionId: string) {
    return apiFetch<{ deleted: boolean }>(
      apiPath`/chats/sessions/${sessionId}`,
      { method: "DELETE", token },
    );
  },
};
