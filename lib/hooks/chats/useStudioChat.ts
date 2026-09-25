"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Id } from "@/types/data-model";
import { useChatActions } from "@/lib/hooks/chats/useChatActions";
import { useChatStudioData } from "@/lib/hooks/chats/useChatStudioData";
import { orderPinnedNotes, type ChatMode } from "@/lib/studio/sessions";

export type NoteRef = { _id: Id<"notes">; title: string };

/**
 * Everything the Studio chat needs, shared by Chat mode and the graph dock so
 * both drive the same active session, draft and @mention state.
 */
export function useStudioChat() {
  const [activeSessionId, setActiveSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [input, setInput] = useState("");

  // @ Mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<NoteRef[]>([]);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);

  const {
    createSession,
    sendMessage,
    deleteSession,
    deleteAllSessions,
    generateAssistantReply,
    pinNotesToSession,
    unpinNoteFromSession,
    setSessionMode,
  } = useChatActions();

  const { sessions, sessionsSettled, messages, activeSession, pinnedNotes, recentNotes } =
    useChatStudioData(activeSessionId);

  const [isThinking, setIsThinking] = useState(false);
  // "Delete all" takes a second click to confirm; the first arms it briefly.
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    if (!confirmDeleteAll) return;
    const timer = setTimeout(() => setConfirmDeleteAll(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteAll]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the selection pointing at a chat that exists: pick the newest one when
  // nothing is selected or the selected chat is gone (deleted elsewhere, stale).
  // This never creates a chat — send creates one on demand — because the
  // list can lag behind a create, and creating here would loop.
  useEffect(() => {
    if (!sessionsSettled) return;
    if (activeSessionId !== null && sessions.some((s) => s._id === activeSessionId)) return;
    const next = sessions[0]?._id ?? null;
    if (next !== activeSessionId) setActiveSessionId(next);
  }, [sessions, sessionsSettled, activeSessionId]);

  const mode = (activeSession?.mode as ChatMode | undefined) ?? "explain";

  const pinnedIds = useMemo(
    () =>
      activeSession?.pinnedNoteIds && Array.isArray(activeSession.pinnedNoteIds)
        ? (activeSession.pinnedNoteIds as Id<"notes">[])
        : [],
    [activeSession?.pinnedNoteIds],
  );

  /** Pinned notes in pin order, so position n matches citation [#n]. */
  const orderedPinnedNotes = useMemo(
    () => orderPinnedNotes(pinnedNotes ?? [], pinnedIds),
    [pinnedNotes, pinnedIds],
  );

  const resetDraft = () => {
    setInput("");
    setSelectedNotes([]);
  };

  const newChat = async () => {
    const newSessionId = await createSession({ title: "New Chat" });
    setActiveSessionId(newSessionId);
    resetDraft();
  };

  const selectSession = (sessionId: Id<"chatSessions">) => {
    setActiveSessionId(sessionId);
  };

  const removeSession = async (sessionId: Id<"chatSessions">) => {
    // Move off the chat before it's gone, so its messages aren't fetched.
    const remaining = sessions.filter((s) => s._id !== sessionId);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0]?._id ?? null);
    }

    await deleteSession({ sessionId });
    if (remaining.length > 0) return;

    // No chats left — auto-spin up a new one.
    const newSessionId = await createSession({ title: "New Chat" });
    setActiveSessionId(newSessionId);
    resetDraft();
  };

  const removeAllSessions = async () => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      return;
    }
    setConfirmDeleteAll(false);
    setActiveSessionId(null);
    resetDraft();
    await deleteAllSessions();
  };

  /** Sends the draft, or `override` text (a suggested prompt) when given. */
  const send = async (override?: string) => {
    const question = override ?? input;
    if (!question.trim() && selectedNotes.length === 0) return;

    let targetSessionId = activeSessionId;

    // Create a new session on the fly if none exists
    if (!targetSessionId) {
      targetSessionId = await createSession({ title: question.slice(0, 30) || "New Chat" });
      setActiveSessionId(targetSessionId);
    }

    const contextNoteIds = selectedNotes.map((n) => n._id);
    const mergedContextIds = Array.from(new Set([...pinnedIds, ...contextNoteIds]));

    await sendMessage({
      sessionId: targetSessionId,
      role: "user",
      content: question,
      contextNoteIds: mergedContextIds.length > 0 ? mergedContextIds : undefined,
    });

    // Sticky context: if user referenced notes, pin them to the session.
    if (contextNoteIds.length > 0) {
      void pinNotesToSession({ sessionId: targetSessionId, noteIds: contextNoteIds });
    }

    if (override === undefined) setInput("");
    setSelectedNotes([]);
    setShowMentions(false);

    setIsThinking(true);
    try {
      await generateAssistantReply({
        sessionId: targetSessionId,
        question,
        contextNoteIds: contextNoteIds.length > 0 ? contextNoteIds : undefined,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const unpin = async (noteId: Id<"notes">) => {
    if (!activeSessionId) return;
    await unpinNoteFromSession({ sessionId: activeSessionId, noteId });
  };

  const setMode = async (next: ChatMode) => {
    if (!activeSessionId) return;
    await setSessionMode({ sessionId: activeSessionId, mode: next });
  };

  /**
   * Pins notes to the active chat, creating one titled `newTitle` when there
   * is none. Used by the graph (node neighbourhoods) and the context rail.
   */
  const pinNotes = async (noteIds: Id<"notes">[], newTitle = "Graph discussion") => {
    if (noteIds.length === 0) return;
    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      targetSessionId = await createSession({ title: newTitle });
      setActiveSessionId(targetSessionId);
    }
    await pinNotesToSession({ sessionId: targetSessionId, noteIds });
  };

  const handleInputChange = (val: string) => {
    setInput(val);

    // Naive mention detection
    const lastAtIdx = val.lastIndexOf("@");
    if (lastAtIdx !== -1) {
      const textAfterAt = val.slice(lastAtIdx + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  /** "@ Add note": starts a mention at the end of the draft and focuses it. */
  const openMentionPicker = () => {
    const next = input.length === 0 || /\s$/.test(input) ? `${input}@` : `${input} @`;
    handleInputChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  };

  const selectMentionNote = (note: NoteRef) => {
    if (!selectedNotes.find((n) => n._id === note._id)) {
      setSelectedNotes([...selectedNotes, note]);
    }

    // Remove the typed @query
    const lastAtIdx = input.lastIndexOf("@");
    if (lastAtIdx !== -1) {
      setInput(input.slice(0, lastAtIdx));
    }
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const removeSelectedNote = (noteId: Id<"notes">) => {
    setSelectedNotes(selectedNotes.filter((n) => n._id !== noteId));
  };

  const filteredNotes = (recentNotes as NoteRef[]).filter((n) =>
    n.title.toLowerCase().includes(mentionFilter),
  );
  const hasMentionResults = showMentions && filteredNotes.length > 0;

  useEffect(() => {
    setMentionActiveIndex(0);
  }, [mentionFilter, showMentions]);

  /** Mention keyboard nav + Enter-to-send, for the composer textarea. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, onSend: () => void) => {
      if (showMentions) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowMentions(false);
          return;
        }
        if (hasMentionResults && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          e.preventDefault();
          setMentionActiveIndex((prev) => {
            const delta = e.key === "ArrowDown" ? 1 : -1;
            return (prev + delta + filteredNotes.length) % filteredNotes.length;
          });
          return;
        }
        if (hasMentionResults && e.key === "Enter") {
          e.preventDefault();
          const picked = filteredNotes[mentionActiveIndex];
          if (picked) selectMentionNote(picked);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    // selectMentionNote closes over input/selectedNotes; recreate with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showMentions, hasMentionResults, filteredNotes, mentionActiveIndex, input, selectedNotes],
  );

  return {
    // data
    sessions,
    messages,
    activeSession,
    activeSessionId,
    pinnedIds,
    pinnedNotes: orderedPinnedNotes,
    recentNotes: recentNotes as NoteRef[],
    mode,
    isThinking,
    confirmDeleteAll,
    // sessions
    newChat,
    selectSession,
    removeSession,
    removeAllSessions,
    setMode,
    unpin,
    pinNotes,
    // composer
    input,
    textareaRef,
    handleInputChange,
    handleKeyDown,
    send,
    selectedNotes,
    removeSelectedNote,
    showMentions,
    setShowMentions,
    filteredNotes,
    mentionActiveIndex,
    setMentionActiveIndex,
    selectMentionNote,
    openMentionPicker,
  };
}

export type StudioChat = ReturnType<typeof useStudioChat>;
