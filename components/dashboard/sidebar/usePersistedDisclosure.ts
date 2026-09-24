"use client";

import { useCallback, useState } from "react";

const STORAGE_PREFIX = "lumina.sidebar.";

/**
 * Open/closed state that survives reloads, so the sidebar comes back arranged
 * the way the student left it. `key` is namespaced by kind, e.g.
 * "section.courses" or "course.<id>".
 *
 * Read during initialization rather than in an effect: the sidebar is mounted
 * client-side only, so there is no server render to mismatch against.
 */
export function usePersistedDisclosure(key: string, defaultOpen: boolean) {
  const [isOpen, setIsOpenState] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + key);
      return stored === null ? defaultOpen : stored === "1";
    } catch {
      // Private mode or a full quota — the default is a fine fallback.
      return defaultOpen;
    }
  });

  const setIsOpen = useCallback(
    (next: boolean) => {
      setIsOpenState(next);
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, next ? "1" : "0");
      } catch {
        // Ignore: losing the preference is better than breaking the click.
      }
    },
    [key],
  );

  const toggle = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, next ? "1" : "0");
      } catch {
        // As above.
      }
      return next;
    });
  }, [key]);

  return { isOpen, toggle, setIsOpen };
}
