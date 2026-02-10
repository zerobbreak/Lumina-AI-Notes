"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  Archive,
  Sparkles,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useKeyboardShortcut, formatShortcut } from "@/hooks/useKeyboardShortcut";
import { useDebounce } from "@/hooks/useDebounce";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: "navigation" | "actions" | "search";
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 150);

  // Queries
  const userData = useQuery(api.users.getUser);
  const quickNotes = useQuery(api.notes.getQuickNotes);
  const recentNotes = useQuery(api.notes.getRecentNotes);
  const files = useQuery(api.files.getFiles);
  const searchResponse = useQuery(
    api.search.search,
    debouncedQuery.trim() ? { query: debouncedQuery } : "skip"
  );
  const searchResults = searchResponse?.results ?? [];

  const { createNoteFlow, TemplateSelector } = useCreateNoteFlow();

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
      title: "New Note",
      subtitle: "Create a new quick note",
      icon: Plus,
      category: "actions",
      action: async () => {
        try {
          const result = await createNoteFlow({
            title: "Untitled Note",
            major: userData?.major || "general",
          });
          if (result?.noteId) {
            router.push(`/dashboard?noteId=${result.noteId}`);
            onOpenChange(false);
          }
        } catch (error) {
          console.error("Failed to create note:", error);
        }
      },
      keywords: ["create", "new", "note"],
    });

    // Navigation commands
    cmds.push({
      id: "dashboard",
      title: "Go to Dashboard",
      subtitle: "Return to main dashboard",
      icon: FolderOpen,
      category: "navigation",
      action: () => {
        router.push("/dashboard");
        onOpenChange(false);
      },
      keywords: ["home", "dashboard", "main"],
    });

    cmds.push({
      id: "flashcards",
      title: "Flashcards",
      subtitle: "View all flashcard decks",
      icon: Layers,
      category: "navigation",
      action: () => {
        router.push("/dashboard?view=flashcards");
        onOpenChange(false);
      },
      keywords: ["study", "cards", "deck"],
    });

    cmds.push({
      id: "archive",
      title: "Archive",
      subtitle: "View archived notes and files",
      icon: Archive,
      category: "navigation",
      action: () => {
        router.push("/dashboard?view=archive");
        onOpenChange(false);
      },
      keywords: ["trash", "archived", "deleted"],
    });

    // Course navigation
    if (userData?.courses) {
      userData.courses.forEach((course) => {
        cmds.push({
          id: `course-${course.id}`,
          title: course.name,
          subtitle: `Open ${course.code}`,
          icon: FolderOpen,
          category: "navigation",
          action: () => {
            router.push(`/dashboard?contextId=${course.id}&contextType=course`);
            onOpenChange(false);
          },
          keywords: [course.code, course.name.toLowerCase(), "course"],
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
  }, [userData, quickNotes, recentNotes, files, router, createNoteFlow, onOpenChange]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return commands;
    }

    const lowerQuery = debouncedQuery.toLowerCase();
    return commands.filter((cmd) => {
      const matchesTitle = cmd.title.toLowerCase().includes(lowerQuery);
      const matchesSubtitle = cmd.subtitle?.toLowerCase().includes(lowerQuery);
      const matchesKeywords = cmd.keywords?.some((kw) =>
        kw.toLowerCase().includes(lowerQuery)
      );

      return matchesTitle || matchesSubtitle || matchesKeywords;
    });
  }, [commands, debouncedQuery]);

  // Add search results to filtered commands
  const allResults = useMemo(() => {
    const results: (Command & { isSearchResult?: boolean })[] = [
      ...filteredCommands,
    ];

    if (debouncedQuery.trim() && searchResults.length > 0) {
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

    return results;
  }, [filteredCommands, searchResults, debouncedQuery, router, onOpenChange]);

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
  const hasQuery = debouncedQuery.trim().length > 0;
  const safeIndex =
    allResults.length === 0
      ? 0
      : Math.min(selectedIndex, allResults.length - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[600px] bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden rounded-xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search className="w-5 h-5 text-gray-500 mr-3 shrink-0" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-gray-600 text-[15px] h-6"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
          />
          <div className="text-[10px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-gray-500 font-mono ml-2">
            {formatShortcut("cmd+p")}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!hasQuery && !hasResults && (
            <div className="text-center py-10 text-gray-600 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-gray-700" />
              <p>Start typing to search or use commands</p>
            </div>
          )}

          {hasQuery && !hasResults && (
            <div className="text-center py-10 text-gray-600 text-sm">
              No results found for &quot;{debouncedQuery}&quot;
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {groupedResults.actions.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </div>
                  {groupedResults.actions.map((cmd, idx) => {
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
              )}

              {groupedResults.navigation.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Navigation
                  </div>
                  {groupedResults.navigation.map((cmd, idx) => {
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
              )}

              {groupedResults.search.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Search Results
                  </div>
                  {groupedResults.search.map((cmd, idx) => {
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
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 bg-white/2 flex items-center justify-between text-[10px] text-gray-600">
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
      <TemplateSelector />
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
          ? "bg-indigo-500/20 text-white border-l-2 border-indigo-400"
          : "hover:bg-white/5 text-gray-300"
      )}
      style={{ scrollMargin: "8px" }}
      data-index={index}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          command.category === "actions" && "bg-emerald-500/10 text-emerald-400",
          command.category === "navigation" && "bg-indigo-500/10 text-indigo-400",
          command.category === "search" && "bg-cyan-500/10 text-cyan-400"
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-medium truncate">{command.title}</h4>
        {command.subtitle && (
          <p className="text-[11px] text-gray-500 truncate">
            {command.subtitle}
          </p>
        )}
      </div>
      {isSelected && (
        <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
      )}
    </div>
  );
}

