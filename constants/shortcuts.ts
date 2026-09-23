import {
  ClipboardList,
  Command,
  Download,
  FilePlus,
  FileSearch,
  ImagePlus,
  Keyboard,
  Layers,
  PanelLeft,
  Pin,
  Plus,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppCommandId } from "@/lib/appCommands";
import { DASHBOARD_NAV } from "./dashboardNav";

/**
 * Keyboard shortcuts, modelled on VS Code. This one list drives the global
 * key handler, the shortcuts dialog and the hints in the command palette.
 *
 * Keys use "mod" for Ctrl on Windows/Linux and ⌘ on macOS.
 */
export interface ShortcutDef {
  id: string;
  title: string;
  /** Alternative combos; the first is the one shown. */
  keys: readonly string[];
  category: "General" | "Navigation" | "Note" | "Editor";
  /**
   * Dispatched when the keys are pressed. Entries without one are handled
   * elsewhere (the editor's own keymap) and are listed for reference only.
   */
  command?: AppCommandId;
  /** Only fires outside text fields and the editor, where the keys mean something else. */
  outsideEditorOnly?: boolean;
  icon?: LucideIcon;
  subtitle?: string;
  keywords?: readonly string[];
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  {
    id: "command-palette",
    title: "Show All Commands",
    keys: ["mod+shift+p", "f1"],
    category: "General",
    command: "command-palette",
    icon: Command,
  },
  {
    id: "quick-open",
    title: "Go to Note",
    keys: ["mod+p"],
    category: "General",
    command: "quick-open",
    icon: FileSearch,
  },
  {
    id: "search",
    title: "Search Notes",
    subtitle: "Search across notes, files and flashcards",
    keys: ["mod+k", "mod+shift+f"],
    category: "General",
    command: "search",
    icon: Search,
    keywords: ["find", "lookup"],
  },
  {
    id: "search-slash",
    title: "Search Notes",
    keys: ["/"],
    category: "General",
    command: "search",
    outsideEditorOnly: true,
  },
  {
    id: "new-note",
    title: "New Note",
    subtitle: "Create a new quick note",
    // Browsers reserve Ctrl+N for a new window; Alt+N works everywhere.
    keys: ["alt+n", "mod+n"],
    category: "General",
    command: "new-note",
    icon: Plus,
    keywords: ["create", "add"],
  },
  {
    id: "toggle-sidebar",
    title: "Toggle Sidebar",
    subtitle: "Show or hide the navigation sidebar",
    // In the editor Ctrl+B is bold, as in VS Code's text editors.
    keys: ["mod+b"],
    category: "General",
    command: "toggle-sidebar",
    outsideEditorOnly: true,
    icon: PanelLeft,
    keywords: ["sidebar", "panel", "hide", "show", "navigation"],
  },
  {
    id: "show-shortcuts",
    title: "Keyboard Shortcuts",
    subtitle: "List every shortcut",
    keys: ["mod+/"],
    category: "General",
    command: "show-shortcuts",
    icon: Keyboard,
    keywords: ["keys", "keybindings", "hotkeys", "help"],
  },

  ...DASHBOARD_NAV.map(
    (item, i): ShortcutDef => ({
      id: `go-${item.id}`,
      title: `Go to ${item.label}`,
      subtitle: item.description,
      keys: [`alt+${i + 1}`],
      category: "Navigation",
      command: `go:${item.id}`,
      icon: item.icon,
      keywords: item.keywords,
    }),
  ),

  {
    id: "ask-ai",
    title: "Ask AI About Selection",
    subtitle: "Simplify, expand, continue or ask a question",
    keys: ["mod+j"],
    category: "Note",
    command: "editor:ask-ai",
    icon: Sparkles,
    keywords: ["ai", "assistant", "rewrite", "explain", "simplify", "expand"],
  },
  { id: "slash", title: "Insert Block (heading, list, math, chart…)", keys: ["/"], category: "Editor" },
  { id: "bold", title: "Bold", keys: ["mod+b"], category: "Editor" },
  { id: "italic", title: "Italic", keys: ["mod+i"], category: "Editor" },
  { id: "underline", title: "Underline", keys: ["mod+u"], category: "Editor" },
  { id: "strike", title: "Strikethrough", keys: ["mod+shift+s"], category: "Editor" },
  { id: "code", title: "Inline Code", keys: ["mod+e"], category: "Editor" },
  { id: "h1", title: "Heading 1 / 2 / 3", keys: ["mod+alt+1"], category: "Editor" },
  { id: "bullets", title: "Bullet List", keys: ["mod+shift+8"], category: "Editor" },
  { id: "numbers", title: "Numbered List", keys: ["mod+shift+7"], category: "Editor" },
  { id: "code-block", title: "Code Block", keys: ["mod+alt+c"], category: "Editor" },
  { id: "quote", title: "Quote", keys: ["mod+shift+b"], category: "Editor" },
  { id: "undo", title: "Undo / Redo", keys: ["mod+z"], category: "Editor" },
];

/** Things to do with the open note; offered in the palette while one is open. */
export interface NoteCommandDef {
  command: AppCommandId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  keywords: readonly string[];
}

export const NOTE_COMMANDS: readonly NoteCommandDef[] = [
  {
    command: "note:new-subpage",
    title: "New Sub-page",
    subtitle: "Create a page nested under this note",
    icon: FilePlus,
    keywords: ["create", "child", "nested", "page"],
  },
  {
    command: "note:flashcards",
    title: "Generate Flashcards",
    subtitle: "Make a deck from this note",
    icon: Layers,
    keywords: ["cards", "study", "ai", "deck"],
  },
  {
    command: "note:quiz",
    title: "Generate Quiz",
    subtitle: "Test yourself on this note",
    icon: ClipboardList,
    keywords: ["test", "questions", "ai", "exam"],
  },
  {
    command: "note:insert-image",
    title: "Insert Image",
    subtitle: "Upload an image into this note",
    icon: ImagePlus,
    keywords: ["picture", "photo", "upload", "media"],
  },
  {
    command: "note:export-pdf",
    title: "Export as PDF",
    subtitle: "Download this note",
    icon: Download,
    keywords: ["download", "print", "save", "pdf"],
  },
  {
    command: "note:collaborate",
    title: "Share & Collaborate",
    subtitle: "Invite people to this note",
    icon: Users,
    keywords: ["share", "invite", "collaborators", "people"],
  },
  {
    command: "note:pin",
    title: "Pin / Unpin Note",
    subtitle: "Keep this note at the top",
    icon: Pin,
    keywords: ["pin", "favorite", "star"],
  },
];

/** The combo shown for a command, if it has one. */
export function shortcutFor(command: AppCommandId): string | undefined {
  return SHORTCUTS.find((s) => s.command === command && !s.outsideEditorOnly)?.keys[0]
    ?? SHORTCUTS.find((s) => s.command === command)?.keys[0];
}
