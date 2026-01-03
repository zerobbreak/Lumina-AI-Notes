import { useEffect, useCallback } from "react";

type KeyboardHandler = (event: KeyboardEvent) => void;

interface UseKeyboardShortcutOptions {
  /**
   * Whether the shortcut is enabled
   */
  enabled?: boolean;
  /**
   * Whether to prevent default behavior
   */
  preventDefault?: boolean;
  /**
   * Whether to stop propagation
   */
  stopPropagation?: boolean;
  /**
   * Keys that should be ignored (e.g., when input is focused)
   */
  ignoreWhen?: (target: EventTarget | null) => boolean;
}

/**
 * Hook to handle keyboard shortcuts
 * @param keys - The key combination (e.g., "ctrl+k", "meta+n")
 * @param handler - The function to call when the shortcut is pressed
 * @param options - Additional options
 */
export function useKeyboardShortcut(
  keys: string,
  handler: KeyboardHandler,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    ignoreWhen = (target) => {
      if (!target) return false;
      if (target instanceof HTMLElement) {
        return (
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"
        );
      }
      return false;
    },
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we should ignore this event
      if (ignoreWhen(event.target)) return;

      // Parse the key combination
      const parts = keys.toLowerCase().split("+").map((s) => s.trim());
      const key = parts[parts.length - 1];
      const hasCtrl = parts.includes("ctrl") || parts.includes("control");
      const hasMeta = parts.includes("meta") || parts.includes("cmd");
      const hasShift = parts.includes("shift");
      const hasAlt = parts.includes("alt") || parts.includes("option");

      // Check if modifiers match
      const ctrlMatch = hasCtrl ? event.ctrlKey : !event.ctrlKey;
      const metaMatch = hasMeta ? event.metaKey : !event.metaKey;
      const shiftMatch = hasShift ? event.shiftKey : !event.shiftKey;
      const altMatch = hasAlt ? event.altKey : !event.altKey;

      // On Mac, cmd key is metaKey. On Windows/Linux, ctrl key is ctrlKey
      // For cross-platform shortcuts, check for either
      const modifierMatch =
        (hasCtrl || hasMeta) && (event.ctrlKey || event.metaKey)
          ? ctrlMatch || metaMatch
          : ctrlMatch && metaMatch;

      // Check if the key matches
      const keyMatch =
        event.key.toLowerCase() === key.toLowerCase() ||
        event.code.toLowerCase() === key.toLowerCase();

      if (modifierMatch && shiftMatch && altMatch && keyMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        handler(event);
      }
    },
    [keys, handler, enabled, preventDefault, stopPropagation, ignoreWhen]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Utility to format keyboard shortcut for display
 */
export function formatShortcut(keys: string): string {
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return keys
    .split("+")
    .map((key) => {
      const trimmed = key.trim().toLowerCase();
      if (trimmed === "meta" || trimmed === "cmd") {
        return isMac ? "⌘" : "Ctrl";
      }
      if (trimmed === "ctrl" || trimmed === "control") {
        return isMac ? "⌃" : "Ctrl";
      }
      if (trimmed === "shift") {
        return isMac ? "⇧" : "Shift";
      }
      if (trimmed === "alt" || trimmed === "option") {
        return isMac ? "⌥" : "Alt";
      }
      // Capitalize first letter for display
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(isMac ? "" : "+");
}

