import { describe, expect, it } from "vitest";
import {
  hasCommandModifier,
  matchesShortcut,
} from "@/hooks/useKeyboardShortcut";
import { SHORTCUTS } from "@/constants/shortcuts";

function key(init: KeyboardEventInit) {
  return new KeyboardEvent("keydown", init);
}

describe("matchesShortcut", () => {
  // Every "cmd+…" shortcut used to fail on Windows: Ctrl was never accepted.
  it("treats mod as Ctrl on Windows and ⌘ on macOS", () => {
    expect(matchesShortcut(key({ key: "p", code: "KeyP", ctrlKey: true }), "mod+p")).toBe(true);
    expect(matchesShortcut(key({ key: "p", code: "KeyP", metaKey: true }), "mod+p")).toBe(true);
    expect(matchesShortcut(key({ key: "p", code: "KeyP" }), "mod+p")).toBe(false);
  });

  it("requires Shift and Alt to match exactly", () => {
    const ctrlShiftP = key({ key: "P", code: "KeyP", ctrlKey: true, shiftKey: true });
    expect(matchesShortcut(ctrlShiftP, "mod+shift+p")).toBe(true);
    expect(matchesShortcut(ctrlShiftP, "mod+p")).toBe(false);
  });

  it("matches Alt+digit by physical key, whatever character it types", () => {
    expect(matchesShortcut(key({ key: "¡", code: "Digit1", altKey: true }), "alt+1")).toBe(true);
    expect(matchesShortcut(key({ key: "™", code: "Digit2", altKey: true }), "alt+1")).toBe(false);
  });

  it("doesn't fire a bare key while Ctrl is held", () => {
    expect(matchesShortcut(key({ key: "/", code: "Slash" }), "/")).toBe(true);
    expect(matchesShortcut(key({ key: "/", code: "Slash", ctrlKey: true }), "/")).toBe(false);
    expect(matchesShortcut(key({ key: "/", code: "Slash", ctrlKey: true }), "mod+/")).toBe(true);
  });

  it("matches function keys", () => {
    expect(matchesShortcut(key({ key: "F1", code: "F1" }), "f1")).toBe(true);
  });
});

describe("shortcut registry", () => {
  it("only lets combos that can't be typing fire inside the editor", () => {
    expect(hasCommandModifier("mod+k")).toBe(true);
    expect(hasCommandModifier("alt+n")).toBe(true);
    expect(hasCommandModifier("f1")).toBe(true);
    expect(hasCommandModifier("/")).toBe(false);
  });

  it("binds no combo to two different commands", () => {
    const owner = new Map<string, string>();
    for (const s of SHORTCUTS) {
      if (!s.command) continue;
      for (const k of s.keys) {
        const scope = s.outsideEditorOnly ? `${k} (outside editor)` : k;
        const prev = owner.get(scope);
        expect(prev === undefined || prev === s.command, `${k}: ${prev} vs ${s.command}`).toBe(true);
        owner.set(scope, s.command);
      }
    }
  });
});
