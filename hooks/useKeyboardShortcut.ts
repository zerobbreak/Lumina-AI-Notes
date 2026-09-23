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
   * Whether the shortcut also fires while typing in an input or the editor.
   * Defaults to true for combos with Ctrl/Cmd/Alt and false for bare keys,
   * so "/" still types a slash but Ctrl+P works mid-sentence.
   */
  allowInEditable?: boolean;
}

/** True when focus is somewhere keystrokes type text. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function parseShortcut(keys: string) {
  // "mod+/" splits into ["mod", "/"]; a literal "+" key is written "plus".
  const parts = keys.toLowerCase().split("+").map((s) => s.trim());
  const key = parts[parts.length - 1] === "plus" ? "+" : parts[parts.length - 1];
  return {
    key,
    // cmd/meta/mod all mean "the platform's command key": Ctrl on Windows
    // and Linux, ⌘ on macOS. Either is accepted so one binding works everywhere.
    mod: parts.some((p) => p === "mod" || p === "cmd" || p === "meta"),
    ctrl: parts.some((p) => p === "ctrl" || p === "control"),
    shift: parts.includes("shift"),
    alt: parts.some((p) => p === "alt" || p === "option"),
  };
}

/** Whether a keystroke is the given combo, e.g. "mod+shift+p", "alt+1", "/". */
export function matchesShortcut(event: KeyboardEvent, keys: string): boolean {
  const s = parseShortcut(keys);

  const commandDown = event.ctrlKey || event.metaKey;
  if (s.mod || s.ctrl) {
    if (s.ctrl ? !event.ctrlKey : !commandDown) return false;
  } else if (commandDown) {
    return false;
  }
  if (s.shift !== event.shiftKey || s.alt !== event.altKey) return false;

  // event.key changes with Shift and Alt ("1" becomes "!" or "¡"), so fall
  // back to the physical key for letters and digits.
  const code = event.code?.toLowerCase() ?? "";
  return (
    event.key?.toLowerCase() === s.key ||
    code === s.key ||
    code === `key${s.key}` ||
    code === `digit${s.key}`
  );
}

/** Whether the combo can't be ordinary typing: it uses Ctrl/Cmd/Alt or a function key. */
export function hasCommandModifier(keys: string): boolean {
  const s = parseShortcut(keys);
  return s.mod || s.ctrl || s.alt || /^f\d{1,2}$/.test(s.key);
}

/**
 * Hook to handle keyboard shortcuts
 * @param keys - The key combination (e.g., "mod+k", "mod+shift+p"), or several
 * @param handler - The function to call when the shortcut is pressed
 * @param options - Additional options
 */
export function useKeyboardShortcut(
  keys: string | readonly string[],
  handler: KeyboardHandler,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    allowInEditable,
  } = options;
  const combos = typeof keys === "string" ? [keys] : keys;
  const comboKey = combos.join(" ");

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const combo = comboKey.split(" ").find((k) => matchesShortcut(event, k));
      if (!combo) return;

      const inEditable = isEditableTarget(event.target);
      if (inEditable && !(allowInEditable ?? hasCommandModifier(combo))) return;

      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      handler(event);
    },
    [comboKey, handler, enabled, preventDefault, stopPropagation, allowInEditable]
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
      if (trimmed === "meta" || trimmed === "cmd" || trimmed === "mod") {
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
      if (trimmed === "plus") return "+";
      // Capitalize first letter for display
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(isMac ? "" : "+");
}
