"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type Snapshot = { noteId: string; content: string };

const same = (a: Snapshot | null, b: Snapshot | null) =>
  a !== null && b !== null && a.noteId === b.noteId && a.content === b.content;

/**
 * Debounced autosave for the note editor.
 *
 * - Saves only content that differs from what was last saved. Every save puts
 *   a new copy of the note in the query cache, so an effect keyed on the note
 *   used to save the same content over and over, bumping the version each time.
 * - Never runs two saves of a note at once. Both would carry the same version,
 *   so the second always came back 409. Edits made while a save is in flight
 *   are saved as soon as it finishes.
 * - Unrelated re-renders don't restart the timer: only a new `content`,
 *   `noteId` or `canSave` does.
 */
export function useNoteAutosave({
  noteId,
  content,
  canSave,
  save,
  onSaved,
  onError,
  delayMs = 1000,
}: {
  noteId: string;
  /** Latest editor HTML, or null before the user has edited anything. */
  content: string | null;
  /** False until the note has loaded (or been created), so nothing saves into the void. */
  canSave: boolean;
  save: (noteId: string, content: string) => Promise<unknown>;
  onSaved: () => void;
  onError: (error: unknown) => void;
  delayMs?: number;
}) {
  // Latest callbacks without making them effect dependencies.
  const callbacks = useRef({ save, onSaved, onError });
  useLayoutEffect(() => {
    callbacks.current = { save, onSaved, onError };
  });

  const latest = useRef<Snapshot | null>(null);
  const lastSaved = useRef<Snapshot | null>(null);
  const inFlight = useRef<Snapshot | null>(null);
  const saveAgain = useRef(false);

  const flush = useCallback(() => {
    const target = latest.current;
    if (!target) return;
    if (inFlight.current) {
      // Wait for it; its version must reach the cache before the next save.
      saveAgain.current = true;
      return;
    }
    if (same(target, lastSaved.current)) {
      callbacks.current.onSaved();
      return;
    }
    inFlight.current = target;
    callbacks.current.save(target.noteId, target.content).then(
      () => {
        lastSaved.current = target;
        inFlight.current = null;
        if (saveAgain.current) {
          saveAgain.current = false;
          flush();
        } else {
          callbacks.current.onSaved();
        }
      },
      (error: unknown) => {
        inFlight.current = null;
        saveAgain.current = false;
        callbacks.current.onError(error);
      },
    );
  }, []);

  useEffect(() => {
    if (content === null || !canSave) return;
    latest.current = { noteId, content };
    const handler = setTimeout(flush, delayMs);
    return () => clearTimeout(handler);
  }, [noteId, content, canSave, delayMs, flush]);
}
