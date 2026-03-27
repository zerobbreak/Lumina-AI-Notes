"use client";

import {
  Search,
  Settings,
  Layers,
  Plus,
  Upload,
  Loader2,
  Archive,
  ClipboardList,
  Pin,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { SearchDialog } from "@/components/dashboard/search/SearchDialog";
import { Course } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";
import { SettingsDialog } from "@/components/dashboard/dialogs/SettingsDialog";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { useDashboard } from "@/hooks/useDashboard";
import { DraggableDocument, DocumentStatusBadge } from "@/components/documents";
import { SidebarCourse } from "./SidebarCourse";
import { SidebarNote } from "./SidebarNote";
import { ActionMenu } from "@/components/shared/ActionMenu"; // Still needed for Files
import { File, FolderOpen, FileText } from "lucide-react"; // Still needed for Files
import {
  useKeyboardShortcut,
  formatShortcut,
} from "@/hooks/useKeyboardShortcut";
import { EmptyState } from "@/components/shared/EmptyState";
import { ThemeToggle } from "@/components/shared/ThemeToggle"; // Import ThemeToggle
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type RenameTarget = {
  id: string;
  type: "note" | "course" | "module" | "file";
  name: string;
  parentId?: string; // For modules (courseId)
};

export function Sidebar() {
  const { user } = useUser();
  const router = useRouter();
  const { leftSidebarState, setLeftSidebarState, toggleLeftSidebar } = useDashboard();
  const searchParams = useSearchParams();
  const { createNoteFlow } = useCreateNoteFlow();

  const isCompact = leftSidebarState === "compact";
  const isOpen = leftSidebarState === "open";
  const isClosed = leftSidebarState === "closed";

  // Queries
  const userData = useQuery(api.users.getUser);
  const quickNotes = useQuery(api.notes.getQuickNotes);
  const recentFiles = useQuery(api.files.getFiles);
  const pinnedNotes = useQuery(api.notes.getPinnedNotes); // Add query

  // Mutations
  const deleteNote = useMutation(api.notes.deleteNote);
  const renameNote = useMutation(api.notes.renameNote);
  const toggleArchiveNote = useMutation(api.notes.toggleArchiveNote);
  const updateNote = useMutation(api.notes.updateNote);

  const createCourse = useMutation(api.users.createCourse);
  const renameCourse = useMutation(api.users.renameCourse);
  const deleteCourse = useMutation(api.users.deleteCourse);

  const renameModule = useMutation(api.users.renameModule);
  const deleteModule = useMutation(api.users.deleteModule);

  const deleteFile = useMutation(api.files.deleteFile);
  const renameFile = useMutation(api.files.renameFile);
  const retryProcessing = useMutation(api.files.retryProcessing);
  const processDocument = useAction(api.ai.processDocument);

  // Local State
  const [expandedCourses, setExpandedCourses] = useState<
    Record<string, boolean>
  >({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandTarget, setExpandTarget] = useState<{
    id: Id<"notes">;
    title: string;
    content?: string;
  } | null>(null);
  const [expandCourse, setExpandCourse] = useState<string>("");
  const [expandModule, setExpandModule] = useState<string>("");

  // Hydration protection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile vs desktop: only mount one sidebar panel so state stays single-instance
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsNarrowViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // --- Handlers ---

  // Rename Confirm Logic
  const handleRenameConfirm = async (newValue: string) => {
    if (!renameTarget) return;
    const { id, type, parentId } = renameTarget;

    try {
      if (type === "note")
        await renameNote({ noteId: id as Id<"notes">, title: newValue });
      else if (type === "file")
        await renameFile({ fileId: id as Id<"files">, name: newValue });
      else if (type === "course")
        await renameCourse({ courseId: id, name: newValue });
      else if (type === "module" && parentId)
        await renameModule({
          courseId: parentId,
          moduleId: id,
          title: newValue,
        });
    } catch (e) {
      console.error(e);
    }
  };

  const openRename = (
    id: string,
    type: "note" | "course" | "module" | "file",
    name: string,
    parentId?: string,
  ) => setRenameTarget({ id, type, name, parentId });

  // Notes
  const handleCreateNote = useCallback(async () => {
    try {
      setIsCreatingNote(true);
      const result = await createNoteFlow({
        title: "Untitled Note",
        major: userData?.major || "general",
      });
      if (result?.noteId) {
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("New note created");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create note");
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNoteFlow, userData?.major, router]);

  // Keyboard shortcuts
  useKeyboardShortcut(
    "cmd+k",
    useCallback(() => {
      setIsSearchOpen((open) => !open);
    }, []),
    { preventDefault: true },
  );

  useKeyboardShortcut(
    "/",
    useCallback(() => {
      setIsSearchOpen((open) => !open);
    }, []),
    { preventDefault: true },
  );

  useKeyboardShortcut("cmd+n", handleCreateNote, { preventDefault: true });

  // Courses
  const handleCreateCourse = async () => {
    try {
      await createCourse({ name: "New Course", code: "CSE 101" });
    } catch (e) {
      console.error(e);
    }
  };

  const sidebarInner = (
    <div className={cn(
      "w-full h-full min-h-0 bg-sidebar flex flex-col group/sidebar overflow-hidden relative transition-all duration-300",
      isCompact && "items-center"
    )}>
      {/* Header / Search */}
      <div className={cn(
        "p-4 flex flex-col gap-4 transition-all duration-300",
        isCompact && "p-2 items-center"
      )}>
        <div className={cn(
          "flex items-center justify-between transition-all gap-2",
          isCompact && "flex-col gap-4"
        )}>
          <div className={cn("flex items-center gap-1.5 min-w-0 flex-1", isCompact && "flex-col px-0 w-full")}>
            {/* Single collapse / expand control (Notion-style: one control, cycles open → compact → closed) */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg",
                isCompact && "w-10 h-10"
              )}
              onClick={toggleLeftSidebar}
              aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
              title={isOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
            <div className={cn("flex items-center gap-2 px-0.5 min-w-0", isCompact && "flex-col gap-2")}>
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              {!isCompact && (
                <span className="font-bold text-sm tracking-tight text-sidebar-foreground animate-in fade-in duration-300 truncate">Lumina</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-8 h-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg shrink-0",
              isCompact && "w-10 h-10 bg-zinc-800/30"
            )}
            onClick={handleCreateNote}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {!isCompact ? (
          <Button
            variant="ghost"
            className="w-full justify-between bg-zinc-800/30 border border-white/5 text-muted-foreground hover:text-sidebar-foreground hover:bg-zinc-800/60 h-9 px-3 transition-all duration-200 rounded-lg group/search"
            onClick={() => setIsSearchOpen(true)}
          >
            <span className="flex items-center gap-2.5 text-[13px]">
              <Search className="w-3.5 h-3.5 opacity-50 group-hover/search:opacity-100 transition-opacity" />
              <span className="opacity-70 group-hover/search:opacity-100 transition-opacity">Search...</span>
            </span>
            <span className="text-[10px] font-medium bg-zinc-800/80 px-1.5 py-0.5 rounded border border-white/5 text-muted-foreground/60">
              {formatShortcut("cmd+k")}
            </span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 text-muted-foreground hover:text-sidebar-foreground hover:bg-zinc-800/60 rounded-lg bg-zinc-800/30"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-2 min-w-0">
        <div className={cn("space-y-6", isCompact && "space-y-8 flex flex-col items-center")}>
          {/* FAVORITES */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-3 mb-1.5 group min-w-0">
                <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Favorites
                </h3>
              </div>
            )}
            <div className={cn("space-y-0.5 w-full", isCompact && "space-y-4 flex flex-col items-center")}>
              {pinnedNotes?.map((note) => (
                <SidebarNote
                  key={note._id}
                  note={note}
                  isCompact={isCompact}
                  onRename={() => openRename(note._id, "note", note.title)}
                  onDelete={() => deleteNote({ noteId: note._id })}
                  onArchive={() => toggleArchiveNote({ noteId: note._id })}
                />
              ))}
              {(!pinnedNotes || pinnedNotes.length === 0) && !isCompact && (
                <div className="px-3 py-2 text-[12px] text-muted-foreground/40 italic">
                  No favorites yet
                </div>
              )}
              {(!pinnedNotes || pinnedNotes.length === 0) && isCompact && (
                <Pin className="w-4 h-4 text-muted-foreground/20" />
              )}
            </div>
          </div>

          {/* RECENT NOTES */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-3 mb-1.5 group min-w-0">
                <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Recent Notes
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 text-muted-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-all rounded-md"
                  onClick={handleCreateNote}
                  disabled={isCreatingNote}
                >
                  {isCreatingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            )}
            <div className={cn("space-y-0.5 w-full", isCompact && "space-y-4 flex flex-col items-center")}>
              {quickNotes?.map((note) => (
                <SidebarNote
                  key={note._id}
                  note={note}
                  isCompact={isCompact}
                  onRename={() => openRename(note._id, "note", note.title)}
                  onDelete={() => deleteNote({ noteId: note._id })}
                  onArchive={() => toggleArchiveNote({ noteId: note._id })}
                />
              ))}
              {(!quickNotes || quickNotes.length === 0) && !isCompact && (
                <div className="px-3 py-2 text-[12px] text-muted-foreground/40 italic">
                  No recent notes
                </div>
              )}
              {(!quickNotes || quickNotes.length === 0) && isCompact && (
                <FileText className="w-4 h-4 text-muted-foreground/20" />
              )}
            </div>
          </div>

          {/* COURSES / SMART FOLDERS */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-3 mb-1.5 group min-w-0">
                <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Smart Folders
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 text-muted-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-all rounded-md"
                  onClick={handleCreateCourse}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className={cn("space-y-1 w-full", isCompact && "space-y-4 flex flex-col items-center")}>
              {userData?.courses?.map((course: Course) => (
                <SidebarCourse
                  key={course.id}
                  course={course}
                  isCompact={isCompact}
                  isExpanded={!!expandedCourses[course.id]}
                  onToggle={() => toggleCourse(course.id)}
                  onRename={(id, name) => openRename(id, "course", name)}
                  onDelete={(id) => deleteCourse({ courseId: id })}
                  onRenameModule={(id, name, parentId) =>
                    openRename(id, "module", name, parentId)
                  }
                  onDeleteModule={(id, parentId) =>
                    deleteModule({ courseId: parentId, moduleId: id })
                  }
                  onRenameNote={(id, title) => openRename(id, "note", title)}
                  onDeleteNote={(id) => deleteNote({ noteId: id as Id<"notes"> })}
                  onArchiveNote={(id) =>
                    toggleArchiveNote({ noteId: id as Id<"notes"> })
                  }
                />
              ))}
              {isCompact && (!userData?.courses || userData.courses.length === 0) && (
                <FolderOpen className="w-4 h-4 text-muted-foreground/20" />
              )}
            </div>
          </div>

          {/* RESOURCE LIBRARY */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-3 mb-1.5 group min-w-0">
                <h3 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Resources
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 text-muted-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent opacity-0 group-hover:opacity-100 transition-all rounded-md"
                  onClick={() => setIsUploadOpen(true)}
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className={cn("space-y-0.5 w-full", isCompact && "space-y-4 flex flex-col items-center")}>
              {recentFiles?.slice(0, 5).map((file) => (
                <DraggableDocument
                  key={file._id}
                  documentId={file._id}
                  documentName={file.name}
                  processingStatus={file.processingStatus}
                  showDragIndicator={false}
                >
                  <div className={cn("relative group/file flex items-center px-1", isCompact && "px-0")}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-8 px-2 text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2.5 transition-all rounded-lg",
                        isCompact && "w-10 h-10 justify-center px-0"
                      )}
                      title={isCompact ? file.name : undefined}
                    >
                      <File className="w-3.5 h-3.5 text-zinc-500 group-hover/file:text-zinc-400 transition-colors shrink-0" />
                      {!isCompact && <span className="truncate flex-1 text-left">{file.name}</span>}
                    </Button>
                    {!isCompact && (
                      <div className="absolute right-2 opacity-0 group-hover/file:opacity-100 transition-opacity">
                        <ActionMenu
                          onRename={() => openRename(file._id, "file", file.name)}
                          onDelete={() => deleteFile({ fileId: file._id })}
                        />
                      </div>
                    )}
                  </div>
                </DraggableDocument>
              ))}
              {isCompact && (!recentFiles || recentFiles.length === 0) && (
                <File className="w-4 h-4 text-muted-foreground/20" />
              )}
            </div>
          </div>

          {/* TOOLS */}
          <div className={cn("min-w-0 w-full pt-2 border-t border-white/5", isCompact && "flex flex-col items-center pt-4")}>
            <div className={cn("space-y-1 w-full", isCompact && "space-y-4 flex flex-col items-center")}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-9 px-3 text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent gap-3 rounded-lg group",
                  isCompact && "w-10 h-10 justify-center px-0"
                )}
                onClick={() => router.push("/dashboard?view=flashcards")}
                title={isCompact ? "Flashcards" : undefined}
              >
                <Layers className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                {!isCompact && <span>Flashcards</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-9 px-3 text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent gap-3 rounded-lg group",
                  isCompact && "w-10 h-10 justify-center px-0"
                )}
                onClick={() => router.push("/dashboard?view=quizzes")}
                title={isCompact ? "Quizzes" : undefined}
              >
                <ClipboardList className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                {!isCompact && <span>Quizzes</span>}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-9 px-3 text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent gap-3 rounded-lg group",
                  isCompact && "w-10 h-10 justify-center px-0"
                )}
                onClick={() => router.push("/dashboard?view=archive")}
                title={isCompact ? "Archive" : undefined}
              >
                <Archive className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 transition-colors" />
                {!isCompact && <span>Archive</span>}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        "p-4 border-t border-white/5 bg-sidebar/50 backdrop-blur-sm space-y-4 transition-all duration-300",
        isCompact && "p-2 items-center flex flex-col"
      )}>
        <div className={cn("flex items-center gap-3 group px-1", isCompact && "flex-col px-0")}>
          <div className="relative">
            {mounted ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: cn(
                      "rounded-lg ring-1 ring-white/10 hover:ring-white/20 transition-all",
                      isCompact ? "w-10 h-10" : "w-8 h-8"
                    ),
                  },
                }}
              />
            ) : (
              <div className={cn("rounded-lg bg-zinc-800 animate-pulse", isCompact ? "w-10 h-10" : "w-8 h-8")} />
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-sidebar rounded-full shadow-sm"></div>
          </div>
          {!isCompact && (
            <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
              <p className="text-[13px] font-semibold text-sidebar-foreground truncate">
                {user?.fullName || "Student"}
              </p>
              <p className="text-[11px] text-muted-foreground/60 truncate">
                Pro Plan
              </p>
            </div>
          )}
          {!isCompact && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          {isCompact && (
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
        {!isCompact && <ThemeToggle />}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / tablet: in-flow sidebar */}
      {!isNarrowViewport && (
        <div
          className={cn(
            "h-screen shrink-0 z-50 relative overflow-visible border-sidebar-border transition-all duration-300 ease-in-out",
            isOpen ? "w-[280px] border-r opacity-100" : 
            isCompact ? "w-[72px] border-r opacity-100" :
            "w-0 border-transparent opacity-0 pointer-events-none"
          )}
        >
          {sidebarInner}
          
          {/* Re-open button when closed */}
          {isClosed && (
            <button
              onClick={() => setLeftSidebarState("open")}
              className="fixed left-4 top-4 w-10 h-10 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground hover:bg-zinc-800 transition-all z-[60] shadow-2xl group/reopen"
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <PanelLeftOpen className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Mobile: overlay drawer (single mounted instance) */}
      {isNarrowViewport && !isClosed ? (
        <div className="fixed inset-0 z-100 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label="Close sidebar"
            onClick={() => setLeftSidebarState("closed")}
          />
          <div className={cn(
            "relative h-full shadow-2xl border-r border-sidebar-border bg-sidebar transition-all duration-300",
            isOpen ? "w-[min(280px,92vw)]" : "w-[72px]"
          )}>
            {sidebarInner}
          </div>
        </div>
      ) : isNarrowViewport && isClosed ? (
        <button
          onClick={() => setLeftSidebarState("open")}
          className="fixed left-4 bottom-4 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl z-[100] active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      ) : null}

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        courseId={
          searchParams.get("contextType") === "course"
            ? (searchParams.get("contextId") ?? undefined)
            : undefined
        }
      />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          initialValue={renameTarget.name}
          title={
            renameTarget.type === "note"
              ? "Note"
              : renameTarget.type === "file"
                ? "File"
                : renameTarget.type === "course"
                  ? "Course"
                  : "Module"
          }
          onConfirm={handleRenameConfirm}
        />
      )}
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <Dialog open={!!expandTarget} onOpenChange={(open) => !open && setExpandTarget(null)}>
        <DialogContent className="sm:max-w-md bg-[#0B0B0B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Expand Quick Capture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-gray-400">
              Choose a course and module for this capture.
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Course</Label>
              <Select value={expandCourse} onValueChange={(val) => {
                setExpandCourse(val);
                setExpandModule("");
              }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                  {userData?.courses?.map((course: Course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {expandCourse && (
              <div className="space-y-2">
                <Label className="text-gray-400">Module (optional)</Label>
                <Select value={expandModule} onValueChange={setExpandModule}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    {(userData?.courses?.find((c: Course) => c.id === expandCourse)?.modules || []).map(
                      (mod) => (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.title}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-gray-400" onClick={() => setExpandTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={!expandCourse || !expandTarget}
              onClick={async () => {
                if (!expandTarget) return;
                const result = await createNoteFlow({
                  title: expandTarget.title || "Quick Capture",
                  major: userData?.major || "general",
                  courseId: expandCourse,
                  moduleId: expandModule || undefined,
                  noteType: "page",
                });
                if (!result?.noteId) return;
                const content = expandTarget.content || "";
                await updateNote({
                  noteId: result.noteId,
                  content: content ? `<p>${content}</p>` : "",
                });
                await updateNote({
                  noteId: expandTarget.id,
                  quickCaptureStatus: "expanded",
                  quickCaptureExpandedNoteId: result.noteId,
                });
                setExpandTarget(null);
                toast.success("Capture expanded into full note");
                router.push(`/dashboard?noteId=${result.noteId}`);
              }}
            >
              Expand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
