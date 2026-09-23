"use client";

import { useEffect } from "react";
import type { Id } from "@/types/data-model";
import { usePresenceActions } from "./usePresenceActions";

export const PRESENCE_HEARTBEAT_INTERVAL = 120 * 1000;

/**
 * Tells collaborators this note is open: a heartbeat now and every interval,
 * and a leave when it closes. Pass the id of a note that has loaded, never
 * the raw `?noteId=` from the address bar; null sends nothing. A link could
 * otherwise make these automatic writes fire at an id of its choosing.
 */
export function useNotePresence(loadedNoteId: Id<"notes"> | null | undefined) {
  const { heartbeat, leave } = usePresenceActions();

  useEffect(() => {
    if (!loadedNoteId) return;
    heartbeat({ noteId: loadedNoteId }).catch(console.error);
    const intervalId = setInterval(() => {
      heartbeat({ noteId: loadedNoteId }).catch(console.error);
    }, PRESENCE_HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(intervalId);
      leave({ noteId: loadedNoteId }).catch(console.error);
    };
  }, [loadedNoteId, heartbeat, leave]);
}
