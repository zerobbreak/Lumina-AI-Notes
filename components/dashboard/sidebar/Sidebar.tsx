"use client";

import {
  Search,
  Settings,
  Layers,
  Plus,
  Upload,
  Loader2,
  Archive,
  Calendar,
  ClipboardList,
  Pin,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
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
import { DraggableDocument } from "@/components/documents";
import { SidebarCourse } from "./SidebarCourse";
import { SidebarNote } from "./SidebarNote";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { File, FolderOpen, FileText } from "lucide-react";
import {
  useKeyboardShortcut,
  formatShortcut,
} from "@/hooks/useKeyboardShortcut";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type RenameTarget = {
  id: string;
  type: "note" | "course" | "module" | "file";
  name: string;
  parentId?: string;
};

export function Sidebar() {
  const { user } = useUser();
  const router = useRouter();
  const { leftSidebarState, setLeftSidebarState, toggleLeftSidebar } =
    useDashboard();
  const searchParams = useSearchParams();
  const { createNoteFlow } = useCreateNoteFlow();

  const isCompact = leftSidebarState === "compact";
  const isOpen = leftSidebarState === "open";
  const isClosed = leftSidebarState === "closed";

  const userData = useQuery(api.users.getUser);
  const quickNotes = useQuery(api.notes.getQuickNotes);
  const recentFiles = useQuery(api.files.getFiles);
  const pinnedNotes = useQuery(api.notes.getPinnedNotes);

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

  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsNarrowViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const calendarView = searchParams.get("view") === "calendar";
  useEffect(() => {
    if (!calendarView) return;
    if (isNarrowViewport) setLeftSidebarState("closed");
    else setLeftSidebarState("compact");
  }, [calendarView, isNarrowViewport, setLeftSidebarState]);

  const openCalendar = useCallback(() => {
    if (isNarrowViewport) setLeftSidebarState("closed");
    else setLeftSidebarState("compact");
    router.push("/dashboard?view=calendar");
  }, [isNarrowViewport, router, setLeftSidebarState]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

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

  const currentNoteId = searchParams.get("noteId");
  const openNote = useQuery(
    api.notes.getNote,
    currentNoteId ? { noteId: currentNoteId as Id<"notes"> } : "skip",
  );

  const handleCreateNote = useCallback(async () => {
    if (currentNoteId && openNote === undefined) return;
    try {
      setIsCreatingNote(true);
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
        toast.success(
          openNote ? "Sub-page created" : "New note created",
        );
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create note");
    } finally {
      setIsCreatingNote(false);
    }
  }, [
    createNoteFlow,
    userData?.major,
    router,
    currentNoteId,
    openNote,
  ]);

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

  const handleCreateCourse = async () => {
    try {
      await createCourse({ name: "New Course", code: "CSE 101" });
    } catch (e) {
      console.error(e);
    }
  };

  const sidebarInner = (
    <div className={cn(
      "w-full h-full min-h-0 bg-sidebar flex flex-col overflow-hidden relative transition-all duration-200",
      isCompact && "items-center"
    )}>
      {/* ── Header ── */}
      <div className={cn(
        "pt-3 pb-2 px-3 flex flex-col gap-2.5",
        isCompact && "p-2 items-center"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          isCompact && "flex-col gap-3"
        )}>
          <div className={cn("flex items-center gap-2 min-w-0 flex-1", isCompact && "flex-col w-full")}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 h-7 w-7 text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors",
                isCompact && "w-9 h-9"
              )}
              onClick={toggleLeftSidebar}
              aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
              title={isOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <PanelLeftClose className="w-[15px] h-[15px]" />
            </Button>
            <div className={cn("flex items-center gap-2 min-w-0", isCompact && "flex-col gap-1.5")}>
              <div className="w-[22px] h-[22px] rounded-[5px] bg-linear-to-br from-primary/90 to-primary/60 flex items-center justify-center shrink-0">
                <Layers className="w-3 h-3 text-primary-foreground" />
              </div>
              {!isCompact && (
                <span className="font-semibold text-[13px] tracking-tight text-sidebar-foreground truncate">
                  Lumina
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-7 h-7 text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors shrink-0",
              isCompact && "w-9 h-9"
            )}
            onClick={handleCreateNote}
            title="New page"
          >
            <Plus className="w-[15px] h-[15px]" />
          </Button>
        </div>

        {/* Search */}
        {!isCompact ? (
          <button
            className="w-full flex items-center justify-between h-[30px] px-2.5 text-muted-foreground/50 hover:bg-sidebar-accent/40 rounded-md transition-colors group/search"
            onClick={() => setIsSearchOpen(true)}
          >
            <span className="flex items-center gap-2 text-[13px]">
              <Search className="w-[14px] h-[14px]" />
              <span>Search</span>
            </span>
            <span className="text-[11px] text-muted-foreground/30 group-hover/search:text-muted-foreground/50 transition-colors">
              {formatShortcut("cmd+k")}
            </span>
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-[15px] h-[15px]" />
          </Button>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <ScrollArea className="flex-1 px-1.5 pb-2 min-w-0">
        <div className={cn("space-y-5 py-1", isCompact && "space-y-6 flex flex-col items-center")}>

          {/* Favorites */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-2 mb-0.5 group min-w-0">
                <h3 className="text-[11px] font-medium text-muted-foreground/40 select-none">
                  Favorites
                </h3>
              </div>
            )}
            <div className={cn("space-y-px w-full", isCompact && "space-y-3 flex flex-col items-center")}>
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
                <div className="px-2 py-1.5 text-[12px] text-muted-foreground/30">
                  No favorites yet
                </div>
              )}
              {(!pinnedNotes || pinnedNotes.length === 0) && isCompact && (
                <Pin className="w-4 h-4 text-muted-foreground/20" />
              )}
            </div>
          </div>

          {/* Recent Notes */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-2 mb-0.5 group min-w-0">
                <h3 className="text-[11px] font-medium text-muted-foreground/40 select-none">
                  Recent
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 text-muted-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 opacity-0 group-hover:opacity-100 transition-all rounded-sm"
                  onClick={handleCreateNote}
                  disabled={isCreatingNote}
                >
                  {isCreatingNote ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                </Button>
              </div>
            )}
            <div className={cn("space-y-px w-full", isCompact && "space-y-3 flex flex-col items-center")}>
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
                <div className="px-2 py-1.5 text-[12px] text-muted-foreground/30">
                  No recent notes
                </div>
              )}
              {(!quickNotes || quickNotes.length === 0) && isCompact && (
                <FileText className="w-4 h-4 text-muted-foreground/20" />
              )}
            </div>
          </div>

          {/* Smart Folders / Courses */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-2 mb-0.5 group min-w-0">
                <h3 className="text-[11px] font-medium text-muted-foreground/40 select-none">
                  Courses
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 text-muted-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 opacity-0 group-hover:opacity-100 transition-all rounded-sm"
                  onClick={handleCreateCourse}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div className={cn("space-y-px w-full", isCompact && "space-y-3 flex flex-col items-center")}>
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

          {/* Resources */}
          <div className={cn("min-w-0 w-full", isCompact && "flex flex-col items-center")}>
            {!isCompact && (
              <div className="flex items-center justify-between px-2 mb-0.5 group min-w-0">
                <h3 className="text-[11px] font-medium text-muted-foreground/40 select-none">
                  Resources
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 text-muted-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 opacity-0 group-hover:opacity-100 transition-all rounded-sm"
                  onClick={() => setIsUploadOpen(true)}
                >
                  <Upload className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div className={cn("space-y-px w-full", isCompact && "space-y-3 flex flex-col items-center")}>
              {recentFiles?.slice(0, 5).map((file) => (
                <DraggableDocument
                  key={file._id}
                  documentId={file._id}
                  documentName={file.name}
                  processingStatus={file.processingStatus}
                  showDragIndicator={false}
                >
                  <div className={cn("relative group/file flex items-center", isCompact && "px-0")}>
                    <button
                      className={cn(
                        "w-full flex items-center h-[30px] px-2 text-[13px] text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 gap-2 transition-colors rounded-md",
                        isCompact && "w-9 h-9 justify-center px-0"
                      )}
                      title={isCompact ? file.name : undefined}
                    >
                      <File className="w-[14px] h-[14px] text-muted-foreground/40 shrink-0" />
                      {!isCompact && <span className="truncate flex-1 text-left">{file.name}</span>}
                    </button>
                    {!isCompact && (
                      <div className="absolute right-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
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

          {/* Tools */}
          <div className={cn(
            "min-w-0 w-full pt-3 border-t border-sidebar-border/50",
            isCompact && "flex flex-col items-center pt-4"
          )}>
            {!isCompact && (
              <div className="px-2 mb-0.5">
                <h3 className="text-[11px] font-medium text-muted-foreground/40 select-none">
                  Tools
                </h3>
              </div>
            )}
            <div className={cn("space-y-px w-full", isCompact && "space-y-3 flex flex-col items-center")}>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center h-[30px] px-2 text-[13px] text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 gap-2.5 rounded-md transition-colors group/tool",
                  isCompact && "w-9 h-9 justify-center px-0",
                  calendarView && "bg-sidebar-accent/50 text-sidebar-foreground",
                )}
                onClick={openCalendar}
                title={isCompact ? "Calendar" : undefined}
              >
                <Calendar className="w-[14px] h-[14px] text-muted-foreground/40 group-hover/tool:text-sidebar-foreground transition-colors" />
                {!isCompact && <span>Calendar</span>}
              </button>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center h-[30px] px-2 text-[13px] text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 gap-2.5 rounded-md transition-colors group/tool",
                  isCompact && "w-9 h-9 justify-center px-0",
                )}
                onClick={() => router.push("/dashboard?view=flashcards")}
                title={isCompact ? "Flashcards" : undefined}
              >
                <Layers className="w-[14px] h-[14px] text-muted-foreground/40 group-hover/tool:text-sidebar-foreground transition-colors" />
                {!isCompact && <span>Flashcards</span>}
              </button>
              <button
                className={cn(
                  "w-full flex items-center h-[30px] px-2 text-[13px] text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 gap-2.5 rounded-md transition-colors group/tool",
                  isCompact && "w-9 h-9 justify-center px-0"
                )}
                onClick={() => router.push("/dashboard?view=quizzes")}
                title={isCompact ? "Quizzes" : undefined}
              >
                <ClipboardList className="w-[14px] h-[14px] text-muted-foreground/40 group-hover/tool:text-sidebar-foreground transition-colors" />
                {!isCompact && <span>Quizzes</span>}
              </button>
              <button
                className={cn(
                  "w-full flex items-center h-[30px] px-2 text-[13px] text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 gap-2.5 rounded-md transition-colors group/tool",
                  isCompact && "w-9 h-9 justify-center px-0"
                )}
                onClick={() => router.push("/dashboard?view=archive")}
                title={isCompact ? "Archive" : undefined}
              >
                <Archive className="w-[14px] h-[14px] text-muted-foreground/40 group-hover/tool:text-sidebar-foreground transition-colors" />
                {!isCompact && <span>Archive</span>}
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* ── Footer ── */}
      <div className={cn(
        "px-3 py-3 border-t border-sidebar-border/50 transition-all duration-200",
        isCompact && "p-2 items-center flex flex-col"
      )}>
        <div className={cn("flex items-center gap-2.5 group/footer", isCompact && "flex-col gap-2")}>
          <div className="relative shrink-0">
            {mounted ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: cn(
                      "rounded-md ring-1 ring-sidebar-border hover:ring-sidebar-foreground/20 transition-all",
                      isCompact ? "w-9 h-9" : "w-7 h-7"
                    ),
                  },
                }}
              />
            ) : (
              <div className={cn("rounded-md bg-sidebar-accent animate-pulse", isCompact ? "w-9 h-9" : "w-7 h-7")} />
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-[1.5px] border-sidebar rounded-full" />
          </div>
          {!isCompact && (
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                {user?.fullName || "Student"}
              </p>
              <p className="text-[11px] text-muted-foreground/40 truncate leading-tight">
                Pro Plan
              </p>
            </div>
          )}
          {!isCompact && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md opacity-0 group-hover/footer:opacity-100 transition-all"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-[14px] h-[14px]" />
            </Button>
          )}
          {isCompact && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-[15px] h-[15px]" />
            </Button>
          )}
        </div>
        {!isCompact && <div className="mt-2.5"><ThemeToggle /></div>}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / tablet */}
      {!isNarrowViewport && (
        <div
          className={cn(
            "h-screen shrink-0 z-50 relative overflow-visible border-sidebar-border transition-all duration-200 ease-out",
            isOpen ? "w-[260px] border-r opacity-100" :
            isCompact ? "w-[60px] border-r opacity-100" :
            "w-0 border-transparent opacity-0 pointer-events-none"
          )}
        >
          {sidebarInner}

          {isClosed && (
            <button
              onClick={() => setLeftSidebarState("open")}
              className="fixed left-3 top-3 w-8 h-8 bg-sidebar border border-sidebar-border rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all z-60"
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Mobile overlay */}
      {isNarrowViewport && !isClosed ? (
        <div className="fixed inset-0 z-100 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close sidebar"
            onClick={() => setLeftSidebarState("closed")}
          />
          <div className={cn(
            "relative h-full shadow-xl border-r border-sidebar-border bg-sidebar transition-all duration-200",
            isOpen ? "w-[min(260px,90vw)]" : "w-[60px]"
          )}>
            {sidebarInner}
          </div>
        </div>
      ) : isNarrowViewport && isClosed ? (
        <button
          onClick={() => setLeftSidebarState("open")}
          className="fixed left-3 bottom-3 w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg z-100 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
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
