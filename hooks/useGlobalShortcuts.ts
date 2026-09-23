"use client";

import { useEffect } from "react";
import { SHORTCUTS } from "@/constants/shortcuts";
import { dispatchAppCommand } from "@/lib/appCommands";
import {
  hasCommandModifier,
  isEditableTarget,
  matchesShortcut,
} from "@/hooks/useKeyboardShortcut";

/** Turns every shortcut in the registry into its app command. Mount once. */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const inEditable = isEditableTarget(event.target);

      for (const shortcut of SHORTCUTS) {
        if (!shortcut.command) continue;
        const combo = shortcut.keys.find((k) => matchesShortcut(event, k));
        if (!combo) continue;
        if (inEditable && (shortcut.outsideEditorOnly || !hasCommandModifier(combo))) continue;

        event.preventDefault();
        dispatchAppCommand(shortcut.command);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
