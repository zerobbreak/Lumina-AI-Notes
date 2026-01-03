"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatShortcut } from "@/hooks/useKeyboardShortcut";
import { Keyboard } from "lucide-react";

interface Shortcut {
  title: string;
  keys: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  {
    title: "Open Command Palette",
    keys: "cmd+p",
    category: "General",
  },
  {
    title: "Search",
    keys: "cmd+k",
    category: "General",
  },
  {
    title: "Create New Note",
    keys: "cmd+n",
    category: "General",
  },
  {
    title: "Show Keyboard Shortcuts",
    keys: "cmd+/",
    category: "General",
  },
  {
    title: "Close Dialog",
    keys: "Esc",
    category: "General",
  },
  {
    title: "Toggle Left Sidebar",
    keys: "cmd+b",
    category: "Navigation",
  },
  {
    title: "Go to Dashboard",
    keys: "cmd+shift+d",
    category: "Navigation",
  },
  {
    title: "Go to Flashcards",
    keys: "cmd+shift+f",
    category: "Navigation",
  },
  {
    title: "Go to Archive",
    keys: "cmd+shift+a",
    category: "Navigation",
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, Shortcut[]>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[500px] overflow-y-auto py-4 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.title}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm text-gray-300">
                      {shortcut.title}
                    </span>
                    <kbd className="px-2.5 py-1 text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 rounded-md font-mono">
                      {formatShortcut(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 text-xs text-gray-500 text-center">
          Press {formatShortcut("Esc")} to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

