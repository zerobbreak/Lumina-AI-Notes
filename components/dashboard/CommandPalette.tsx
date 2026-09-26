"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearch } from "@/lib/queries/search/useSearch";
import { useFiles } from "@/lib/queries/files/useFiles";
import { useQuickNotes } from "@/lib/queries/notes/useQuickNotes";
import { useRecentNotes } from "@/lib/queries/notes/useRecentNotes";
import { useNote } from "@/lib/queries/notes/useNote";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  FileText,
  File,
  Layers,
  Plus,
  Search,
  FolderOpen,
  Sparkles,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Compass,
  MessageSquarePlus,
} from "lucide-react";
import { DASHBOARD_NAV } from "@/constants/dashboardNav";
import { NOTE_COMMANDS, SHORTCUTS, shortcutFor } from "@/constants/shortcuts";
import { dispatchAppCommand, type AppCommandId } from "@/lib/appCommands";
import { useKeyboardShortcut, formatShortcut } from "@/hooks/useKeyboardShortcut";
import { useDebounce } from "@/hooks/useDebounce";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: "note" | "actions" | "navigation" | "search";
  keywords?: readonly string[];
  /** Shown on the right, e.g. "mod+b". */
  shortcut?: string;
  /** A note, file or course rather than a command; hidden in ">" mode. */
  isContent?: boolean;
}

const GROUPS: { category: Command["category"]; label: string }[] = [
  { category: "note", label: "This Note" },
  { category: "actions", label: "Commands" },
  { category: "navigation", label: "Go To" },
  { category: "search", label: "Search Results" },
];

// Commands the palette already offers in its own form, or that just reopen it.
const NOT_IN_PALETTE = new Set<AppCommandId>(["command-palette", "quick-open", "new-note"]);

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starting text; ">" lists only commands, as VS Code's Ctrl+Shift+P does. */
  initialQuery?: string;
}

export function CommandPalette({ open, onOpenChange, initialQuery = "" }: CommandPaletteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentNoteId = searchParams.get("noteId");
  const { data: openNote, isLoading: openNoteLoading } = useNote(currentNoteId);

  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedInput = useDebounce(query, 150);
  const isCommandMode = query.trimStart().startsWith(">");
  const debouncedQuery = debouncedInput.trimStart().replace(/^>/, "").trim();

  const { data: userData } = useCurrentUser();
  const { data: quickNotes } = useQuickNotes();
  const { data: recentNotes } = useRecentNotes();
  const { data: files } = useFiles();
  const { data: searchData } = useSearch(
    { query: debouncedQuery },
    Boolean(debouncedQuery) && !isCommandMode,
  );
  const searchResults = searchData?.results ?? [];

  const { createNoteFlow } = useCreateNoteFlow();

  // Close on Escape
  useKeyboardShortcut(
    "Escape",
    useCallback(() => {
      if (open) {
        onOpenChange(false);
        setQuery("");
        setSelectedIndex(0);
      }
    }, [open, onOpenChange]),
    { enabled: open }
  );

  // Build command list
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // Action commands
    cmds.push({
      id: "new-note",
      title: openNote ? "New Sub-page" : "New Note",
      subtitle: openNote
        ? "Create a page nested under the open note"
        : "Create a new quick note",
      icon: Plus,
      category: "actions",
      action: async () => {
        if (currentNoteId && openNoteLoading) return;
        try {
          const result = await createNoteFlow({
            title: "Untitled Note",
            major: userData?.major || "general",
            ...(openNote
              ? {
                  parentNoteId: openNote._id,
                  courseId: openNote.courseId,
                  moduleId: openNote.moduleId,
                  noteType: "page",
                }
              : {}),
          });
          if (result?.noteId) {
            router.push(`/dashboard?noteId=${result.noteId}`);
            onOpenChange(false);
          }
        } catch (error) {
          console.error("Failed to create note:", error);
        }
      },
      keywords: ["create", "new", "note", "subpage", "nested"],
      shortcut: shortcutFor("new-note"),
    });

    // Close first so a dialog the command opens doesn't fight this one for focus.
    const run = (id: AppCommandId) => () => {
      onOpenChange(false);
      window.setTimeout(() => dispatchAppCommand(id), 0);
    };

    // Things to do with the open note.
    if (openNote) {
      NOTE_COMMANDS.forEach((c) => {
        if (c.command === "note:new-subpage") return; // "New Sub-page" above
        cmds.push({
          id: c.command,
          title: c.title,
          subtitle: c.subtitle,
          icon: c.icon,
          category: "note",
          action: run(c.command),
          keywords: c.keywords,
        });
      });
      const askAi = SHORTCUTS.find((s) => s.command === "editor:ask-ai");
      if (askAi?.icon) {
        cmds.push({
          id: askAi.id,
          title: askAi.title,
          subtitle: "Select some text in the note first",
          icon: askAi.icon,
          category: "note",
          action: run("editor:ask-ai"),
          keywords: askAi.keywords,
          shortcut: askAi.keys[0],
        });
      }
    }

    // App-wide commands, each with its shortcut.
    SHORTCUTS.forEach((s) => {
      if (!s.command || !s.icon || s.category !== "General") return;
      if (NOT_IN_PALETTE.has(s.command)) return;
      cmds.push({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        icon: s.icon,
        category: "actions",
        action: run(s.command),
        keywords: s.keywords,
        shortcut: s.keys[0],
      });
    });

    // The walkthroughs. A fresh tour value each time, so Home opens it again
    // even when the last one was closed on this same page.
    cmds.push({
      id: "tour-home",
      title: "Take the Tour",
      subtitle: "A walkthrough of Home, the sidebar and what everything does",
      icon: Compass,
      category: "actions",
      action: () => {
        onOpenChange(false);
        router.push(`/dashboard?view=home&tour=${Date.now()}`);
      },
      keywords: ["tour", "walkthrough", "help", "guide", "onboarding", "tutorial", "how"],
    });
    cmds.push({
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Report a bug, suggest an idea or ask for higher limits",
      icon: MessageSquarePlus,
      category: "actions",
      action: run("feedback"),
      keywords: ["feedback", "bug", "report", "idea", "suggest", "help", "contact", "limit", "beta"],
    });
    if (openNote) {
      cmds.push({
        id: "tour-note",
        title: "Tour the Note Editor",
        subtitle: "Writing, Ask AI, the study dock and note actions",
        icon: Compass,
        category: "note",
        action: run("tour:note"),
        keywords: ["tour", "walkthrough", "help", "guide", "editor", "tutorial"],
      });
    }

    // Navigation commands — same source of truth as the sidebar.
    DASHBOARD_NAV.forEach((item) => {
      cmds.push({
        id: item.id,
        title: item.label,
        subtitle: item.description,
        icon: item.icon,
        category: "navigation",
        action: () => {
          router.push(item.href);
          onOpenChange(false);
        },
        keywords: item.keywords,
        shortcut: shortcutFor(`go:${item.id}`),
      });
    });

    // Course navigation
    if (userData?.courses) {
      userData.courses.forEach((course) => {
        cmds.push({
          id: `course-${course.id}`,
          title: course.name,
          subtitle: `Open ${course.code}`,
          isContent: true,
          icon: FolderOpen,
          category: "navigation",
          action: () => {
            router.push(`/dashboard?contextId=${course.id}&contextType=course`);
            onOpenChange(false);
          },
          keywords: [course.code, course.name.toLowerCase(), "course", "module"],
        });
      });
    }

    // Recent notes
    if (recentNotes) {
      recentNotes.slice(0, 5).forEach((note) => {
        cmds.push({
          id: `note-${note._id}`,
          title: note.title,
          subtitle: "Open note",
          isContent: true,
          icon: FileText,
          category: "navigation",
          action: () => {
            router.push(`/dashboard?noteId=${note._id}`);
            onOpenChange(false);
          },
          keywords: ["note", note.title.toLowerCase()],
        });
      });
    }

    // Quick notes
    if (quickNotes) {
      quickNotes.slice(0, 5).forEach((note) => {
        if (!recentNotes?.some((n) => n._id === note._id)) {
          cmds.push({
            id: `quick-note-${note._id}`,
            title: note.title,
            subtitle: "Open quick note",
            isContent: true,
            icon: FileText,
            category: "navigation",
            action: () => {
              router.push(`/dashboard?noteId=${note._id}`);
              onOpenChange(false);
            },
            keywords: ["quick", "note", note.title.toLowerCase()],
          });
        }
      });
    }

    // Files
    if (files) {
      files.slice(0, 5).forEach((file) => {
        cmds.push({
          id: `file-${file._id}`,
          title: file.name,
          subtitle: "View file",
          isContent: true,
          icon: File,
          category: "navigation",
          action: () => {
            // Files might need special handling - for now just show in context
            router.push("/dashboard");
            onOpenChange(false);
          },
          keywords: ["file", file.name.toLowerCase()],
        });
      });
    }

    return cmds;
  }, [
    userData,
    quickNotes,
    recentNotes,
    files,
    router,
    createNoteFlow,
    onOpenChange,
    currentNoteId,
    openNote,
  ]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    const pool = isCommandMode ? commands.filter((cmd) => !cmd.isContent) : commands;
    if (!debouncedQuery) {
      return pool;
    }

    // Every word must match somewhere, so "exp pdf" finds "Export as PDF".
    const words = debouncedQuery.toLowerCase().split(/\s+/);
    return pool.filter((cmd) => {
      const haystack = [cmd.title, cmd.subtitle ?? "", ...(cmd.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [commands, debouncedQuery, isCommandMode]);

  // Add search results to filtered commands
  const allResults = useMemo(() => {
    const results: (Command & { isSearchResult?: boolean })[] = [
      ...filteredCommands,
    ];

    if (debouncedQuery && !isCommandMode && searchResults.length > 0) {
      searchResults.forEach((result) => {
        results.push({
          id: `search-${result.id}`,
          title: result.title,
          subtitle: result.subtitle,
          icon:
            result.type === "note"
              ? FileText
              : result.type === "file"
                ? File
                : Layers,
          category: "search",
          isSearchResult: true,
          action: () => {
            router.push(result.url);
            onOpenChange(false);
          },
          keywords: [],
        });
      });
    }

    // In display order, so arrow keys move down the list as drawn.
    const rank = (c: Command) => GROUPS.findIndex((g) => g.category === c.category);
    return results.sort((a, b) => rank(a) - rank(b));
  }, [filteredCommands, searchResults, debouncedQuery, isCommandMode, router, onOpenChange]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const maxIndex = Math.max(allResults.length - 1, 0);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const safeIndex =
          allResults.length === 0 ? 0 : Math.min(selectedIndex, maxIndex);
        if (allResults[safeIndex]) {
          allResults[safeIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, allResults, selectedIndex]);

  // Group commands by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof allResults> = {
      note: [],
      actions: [],
      navigation: [],
      search: [],
    };

    allResults.forEach((cmd) => {
      if (groups[cmd.category]) {
        groups[cmd.category].push(cmd);
      }
    });

    return groups;
  }, [allResults]);

  const hasResults = allResults.length > 0;
  const hasQuery = debouncedQuery.length > 0;

  useEffect(() => {
    document
      .querySelector(`[data-palette-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);
  const safeIndex =
    allResults.length === 0
      ? 0
      : Math.min(selectedIndex, allResults.length - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[600px] bg-background border border-border shadow-2xl overflow-hidden rounded-xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center px-4 py-3 border-b border-border/60">
          <Search className="w-5 h-5 text-muted-foreground/80 mr-3 shrink-0" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 text-[15px] h-6"
            placeholder={
              isCommandMode
                ? "Type a command…"
                : "Search notes and commands… (type > for commands only)"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
          />
          <div className="text-[10px] bg-foreground/5 border border-border/60 px-1.5 py-0.5 rounded text-muted-foreground/80 font-mono ml-2">
            {formatShortcut(shortcutFor(isCommandMode ? "command-palette" : "quick-open") ?? "mod+p")}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!hasQuery && !hasResults && (
            <div className="text-center py-10 text-muted-foreground/60 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p>Start typing to search, or type &gt; for commands</p>
            </div>
          )}

          {hasQuery && !hasResults && (
            <div className="text-center py-10 text-muted-foreground/60 text-sm">
              No results found for &quot;{debouncedQuery}&quot;
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {GROUPS.map(({ category, label }) =>
                groupedResults[category].length > 0 ? (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {label}
                    </div>
                    {groupedResults[category].map((cmd) => {
                      const globalIdx = allResults.indexOf(cmd);
                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={safeIndex === globalIdx}
                          index={globalIdx}
                        />
                      );
                    })}
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border/60 bg-foreground/2 flex items-center justify-between text-[10px] text-muted-foreground/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              Select
            </span>
          </div>
          <span>{formatShortcut("Esc")} to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandItem({
  command,
  isSelected,
  index,
}: {
  command: Command;
  isSelected: boolean;
  index: number;
}) {
  const Icon = command.icon;

  return (
    <div
      onClick={command.action}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/20 text-foreground border-l-2 border-primary"
          : "hover:bg-foreground/5 text-foreground/80"
      )}
      style={{ scrollMargin: "8px" }}
      data-palette-index={index}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          command.category === "actions" && "bg-emerald-500/10 text-emerald-400",
          command.category === "navigation" && "bg-primary/10 text-primary",
          command.category === "search" && "bg-cyan-500/10 text-cyan-400"
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-medium truncate">{command.title}</h4>
        {command.subtitle && (
          <p className="text-[11px] text-muted-foreground/80 truncate">
            {command.subtitle}
          </p>
        )}
      </div>
      {command.shortcut && (
        <kbd className="shrink-0 rounded border border-border bg-foreground/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {formatShortcut(command.shortcut)}
        </kbd>
      )}
      {isSelected && (
        <CornerDownLeft className="w-3.5 h-3.5 text-primary" />
      )}
    </div>
  );
}

