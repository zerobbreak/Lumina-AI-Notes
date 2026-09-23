"use client";

import type { Id } from "@/types/data-model";
import { useChatContextNotes } from "@/lib/queries/chats/useChatContextNotes";
import { useChatMessages } from "@/lib/queries/chats/useChatMessages";
import { useChatSession } from "@/lib/queries/chats/useChatSession";
import { useChatSessions } from "@/lib/queries/chats/useChatSessions";
import { useRecentNotes } from "@/lib/queries/notes/useRecentNotes";

/** Chat studio read model (REST). */
export function useChatStudioData(activeSessionId: Id<"chatSessions"> | null) {
  const sessionsRest = useChatSessions();
  const sessions = sessionsRest.data ?? [];

  const messagesRest = useChatMessages(activeSessionId);
  const messages = messagesRest.data;

  const activeSessionRest = useChatSession(activeSessionId);
  const activeSession = activeSessionRest.data;

  const pinnedIds =
    activeSession?.pinnedNoteIds && activeSession.pinnedNoteIds.length > 0
      ? (activeSession.pinnedNoteIds as Id<"notes">[])
      : [];

  const pinnedNotesRest = useChatContextNotes(pinnedIds, pinnedIds.length > 0);
  const pinnedNotes = pinnedIds.length > 0 ? pinnedNotesRest.data : [];

  const recentNotesRest = useRecentNotes();
  const recentNotes = recentNotesRest.data ?? [];

  return {
    sessions,
    messages,
    activeSession,
    pinnedNotes,
    recentNotes,
  };
}
