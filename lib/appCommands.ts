"use client";

import { useEffect, useRef } from "react";

/**
 * Commands a shortcut or the command palette can trigger. Each is carried
 * out by whichever mounted component owns the state it needs (the sidebar
 * owns search, the note view owns its dialogs), so the caller doesn't have
 * to know who that is. A command nobody is listening for does nothing.
 */
export type AppCommandId =
  | "command-palette"
  | "quick-open"
  | "search"
  | "new-note"
  | "show-shortcuts"
  | "toggle-sidebar"
  | `go:${string}`
  /** Opens settings on the tab after the colon, e.g. "settings:integrations". */
  | `settings:${string}`
  | "note:export-pdf"
  | "note:flashcards"
  | "note:quiz"
  | "note:collaborate"
  | "note:insert-image"
  | "note:new-subpage"
  | "note:pin"
  | "editor:ask-ai"
  /** Replays the note-screen walkthrough. */
  | "tour:note";

const APP_COMMAND_EVENT = "lumina:command";

export function dispatchAppCommand(id: AppCommandId) {
  window.dispatchEvent(new CustomEvent<AppCommandId>(APP_COMMAND_EVENT, { detail: id }));
}

/** Calls the handler for every command dispatched while mounted. */
export function useAppCommands(handler: (id: AppCommandId) => void) {
  // Latest handler, without re-subscribing every render.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (e: Event) => handlerRef.current((e as CustomEvent<AppCommandId>).detail);
    window.addEventListener(APP_COMMAND_EVENT, listener);
    return () => window.removeEventListener(APP_COMMAND_EVENT, listener);
  }, []);
}

export function useAppCommand(id: AppCommandId, handler: () => void) {
  useAppCommands((dispatched) => {
    if (dispatched === id) handler();
  });
}
