"use client";

import { Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatShortcut } from "@/hooks/useKeyboardShortcut";
import { SHORTCUTS, type ShortcutDef } from "@/constants/shortcuts";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Entries sharing a title (Search on Ctrl+K and on "/") show as one row.
function groupShortcuts() {
  const groups = new Map<string, { title: string; keys: string[]; note?: string }[]>();
  for (const s of SHORTCUTS as readonly ShortcutDef[]) {
    const rows = groups.get(s.category) ?? [];
    const row = rows.find((r) => r.title === s.title);
    if (row) row.keys.push(...s.keys);
    else rows.push({ title: s.title, keys: [...s.keys], note: s.outsideEditorOnly ? "outside the editor" : undefined });
    groups.set(s.category, rows);
  }
  return [...groups.entries()];
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const groupedShortcuts = groupShortcuts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[500px] overflow-y-auto py-4 space-y-6">
          {groupedShortcuts.map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.title}
                    className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-foreground/5 transition-colors"
                  >
                    <span className="text-sm text-foreground/80">
                      {shortcut.title}
                      {shortcut.note && (
                        <span className="ml-2 text-xs text-muted-foreground/80">({shortcut.note})</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground/60">
                      {shortcut.keys.map((keys, i) => (
                        <Fragment key={keys}>
                          {i > 0 && "or"}
                          <kbd className="px-2.5 py-1 text-xs font-semibold text-muted-foreground bg-foreground/5 border border-border rounded-md font-mono">
                            {formatShortcut(keys)}
                          </kbd>
                        </Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border text-xs text-muted-foreground/80 text-center">
          Press {formatShortcut("Esc")} to close
        </div>
      </DialogContent>
    </Dialog>
  );
}
