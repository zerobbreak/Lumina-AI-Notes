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
} from "lucide-react";
import { toast } from "sonner";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { SearchDialog } from "@/components/dashboard/search/SearchDialog";
import { Course, UserFile } from "@/types";
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

type RenameTarget = {
  id: string;
  type: "note" | "course" | "module" | "file";
  name: string;
  parentId?: string; // For modules (courseId)
};

export function Sidebar() {
  const { user } = useUser();
  const router = useRouter();
  const { isLeftSidebarOpen } = useDashboard();
  const searchParams = useSearchParams();

  // Queries
  const userData = useQuery(api.users.getUser);
  const createNote = useMutation(api.notes.createNote);
  const quickNotes = useQuery(api.notes.getQuickNotes);
  const recentFiles = useQuery(api.files.getFiles);
  const pinnedNotes = useQuery(api.notes.getPinnedNotes); // Add query

  // Mutations
  const deleteNote = useMutation(api.notes.deleteNote);
  const renameNote = useMutation(api.notes.renameNote);
  const toggleArchiveNote = useMutation(api.notes.toggleArchiveNote);

  const createCourse = useMutation(api.users.createCourse);
  const renameCourse = useMutation(api.users.renameCourse);
  const deleteCourse = useMutation(api.users.deleteCourse);

  const renameModule = useMutation(api.users.renameModule);
  const deleteModule = useMutation(api.users.deleteModule);

  const deleteFile = useMutation(api.files.deleteFile);
  const renameFile = useMutation(api.files.renameFile);
  const updateFileStatus = useMutation(api.files.updateProcessingStatus);
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

  // Hydration protection
  useEffect(() => {
    setMounted(true);
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
      const noteId = await createNote({
        title: "Untitled Note",
        major: userData?.major || "general",
        style: "standard",
      });
      router.push(`/dashboard?noteId=${noteId}`);
      toast.success("New note created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create note");
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNote, userData?.major, router]);

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

  if (!isLeftSidebarOpen) return null;

  return (
    <div className="w-[280px] h-screen bg-sidebar backdrop-blur-2xl border-r border-sidebar-border flex flex-col shrink-0 z-50 relative group/sidebar shadow-2xl shadow-black/50 dark:shadow-black/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="flex items-center gap-3.5 p-2 rounded-xl bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-all duration-300 cursor-pointer group shadow-sm">
          <div className="w-9 h-9 bg-linear-to-br from-indigo-500 via-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.5)] transition-shadow">
            <span className="drop-shadow-md">U</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-semibold text-slate-900 dark:text-white text-[13px] tracking-wide truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-100 transition-colors">
              University of Tech
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-medium truncate">
                {userData?.onboardingComplete ? "Pro Plan" : "Free"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // #region agent log
              fetch(
                "http://127.0.0.1:7242/ingest/8626f50f-15c3-4d25-a870-15d8a0db509b",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "Sidebar.tsx:profile-settings-click",
                    message: "Profile settings button clicked",
                    data: { which: "profile", beforeOpen: false },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    hypothesisId: "A",
                  }),
                },
              ).catch(() => {});
              // #endregion
              setIsSettingsOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 dark:text-gray-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <Button
          variant="ghost"
          className="w-full justify-between bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 h-10 px-3 transition-all duration-200"
          onClick={() => setIsSearchOpen(true)}
        >
          <span className="flex items-center gap-2.5 text-xs font-medium">
            <Search className="w-3.5 h-3.5 opacity-70" />
            <span className="opacity-80">Search notes...</span>
          </span>
          <span className="text-[10px] font-bold bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-[4px] border border-slate-300 dark:border-white/5 text-slate-500 dark:text-gray-300">
            {formatShortcut("cmd+k")}
          </span>
        </Button>
      </div>
      <ScrollArea className="flex-1 px-3 py-3 min-w-0">
        {/* FAVORITES */}
        <div className="mb-6 min-w-0">
          <div className="flex items-center justify-between px-2 mb-2 group min-w-0">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-slate-600 dark:group-hover:text-gray-400">
              Favorites
            </h3>
          </div>
          <div className="space-y-0.5">
            {pinnedNotes?.map((note) => (
              <SidebarNote
                key={note._id}
                note={note}
                onRename={() => openRename(note._id, "note", note.title)}
                onDelete={() => deleteNote({ noteId: note._id })}
                onArchive={() => toggleArchiveNote({ noteId: note._id })}
              />
            ))}
            {(!pinnedNotes || pinnedNotes.length === 0) && (
              <EmptyState
                icon={<Pin className="w-5 h-5 text-rose-400" />}
                title="No favorites"
                description="Pin important notes to access them quickly"
                className="py-6 px-2"
              />
            )}
          </div>
        </div>

        {/* COURSES */}
        <div className="mb-6 min-w-0">
          <div className="flex items-center justify-between px-2 mb-2 group min-w-0">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-slate-600 dark:group-hover:text-gray-400">
              Smart Folders
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 opacity-40 group-hover:opacity-100 transition-all rounded-md"
              onClick={handleCreateCourse}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {userData?.courses?.map((course: Course) => (
              <SidebarCourse
                key={course.id}
                course={course}
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
            {(!userData?.courses || userData.courses.length === 0) && (
              <EmptyState
                icon={<FolderOpen className="w-5 h-5 text-indigo-400" />}
                title="No Smart Folders yet"
                description="Create a smart folder to organize your notes by course or topic"
                action={{
                  label: "Create Smart Folder",
                  onClick: handleCreateCourse,
                }}
                className="py-6 px-2"
              />
            )}
          </div>
        </div>

        {/* FILES */}
        <div className="mb-6 min-w-0">
          <div className="flex items-center justify-between px-2 mb-2 group min-w-0">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-slate-600 dark:group-hover:text-gray-400">
              Resource Library
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 opacity-40 group-hover:opacity-100 transition-all rounded-md"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {recentFiles?.map((file) => (
              <DraggableDocument
                key={file._id}
                documentId={file._id}
                documentName={file.name}
                processingStatus={file.processingStatus}
                showDragIndicator={false}
              >
                <div className="relative group/file flex items-center">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 px-2.5 pr-16 text-[13px] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/4 gap-3 transition-all"
                  >
                    <File className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500/70 group-hover/file:text-blue-500 dark:group-hover/file:text-blue-400 transition-colors shrink-0" />
                    <span className="truncate flex-1 text-left">
                      {file.name}
                    </span>
                    <DocumentStatusBadge status={file.processingStatus} />
                  </Button>
                  <div className="absolute right-1 transition-all">
                    <ActionMenu
                      onRename={() => openRename(file._id, "file", file.name)}
                      onDelete={() => deleteFile({ fileId: file._id })}
                      showRetry={file.processingStatus === "error"}
                      onRetry={async () => {
                        await updateFileStatus({
                          fileId: file._id,
                          status: "pending",
                        });
                        await processDocument({ fileId: file._id });
                      }}
                    />
                  </div>
                </div>
              </DraggableDocument>
            ))}
            {(!recentFiles || recentFiles.length === 0) && (
              <EmptyState
                icon={<File className="w-5 h-5 text-blue-400" />}
                title="No files yet"
                description="Upload PDFs, documents, or audio files to enhance your notes"
                action={{
                  label: "Upload File",
                  onClick: () => setIsUploadOpen(true),
                }}
                className="py-6 px-2"
              />
            )}
          </div>
        </div>

        {/* NOTES */}
        <div className="mb-6 min-w-0">
          <div className="flex items-center justify-between px-2 mb-2 group min-w-0">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-slate-600 dark:group-hover:text-gray-400">
              Quick Notes
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-all rounded-md"
              onClick={handleCreateNote}
              title="Create Quick Note"
            >
              {isCreatingNote ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <div className="space-y-0.5">
            {quickNotes?.map((note) => (
              <SidebarNote
                key={note._id}
                note={note}
                onRename={() => openRename(note._id, "note", note.title)}
                onDelete={() => deleteNote({ noteId: note._id })}
                onArchive={() => toggleArchiveNote({ noteId: note._id })}
              />
            ))}
            {(!quickNotes || quickNotes.length === 0) && (
              <EmptyState
                icon={<FileText className="w-5 h-5 text-amber-400" />}
                title="No quick notes"
                description="Create a quick note for ideas, reminders, or quick thoughts"
                action={{
                  label: "Create Note",
                  onClick: handleCreateNote,
                }}
                className="py-6 px-2"
              />
            )}
          </div>
        </div>

        {/* FLASHCARDS */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-slate-600 dark:group-hover:text-gray-400">
              Study Tools
            </h3>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start h-9 px-2.5 text-[13px] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/4 gap-3 transition-all group"
            onClick={() => router.push("/dashboard?view=flashcards")}
          >
            <div className="p-0.5 rounded bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
              <Layers className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
            </div>
            <span>Flashcards</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-9 px-2.5 text-[13px] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/4 gap-3 transition-all group mt-1"
            onClick={() => router.push("/dashboard?view=quizzes")}
          >
            <div className="p-0.5 rounded bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
              <ClipboardList className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
            </div>
            <span>Quizzes</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-9 px-2.5 text-[13px] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/4 gap-3 transition-all group mt-1"
            onClick={() => router.push("/dashboard?view=archive")}
          >
            <div className="p-0.5 rounded bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
              <Archive className="w-3.5 h-3.5 text-orange-400 group-hover:text-orange-300" />
            </div>
            <span>Trash & Archive</span>
          </Button>
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-slate-200 dark:border-white/6 bg-slate-50 dark:bg-black/20 backdrop-blur-md space-y-3">
        {/* User Card */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            {mounted ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 rounded-xl ring-2 ring-white/5",
                  },
                }}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            )}
            {mounted && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full"></div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-gray-200 transition-colors">
              {user?.fullName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-500 truncate group-hover:text-slate-600 dark:group-hover:text-gray-400 transition-colors">
              Student Account
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              // #region agent log
              fetch(
                "http://127.0.0.1:7242/ingest/8626f50f-15c3-4d25-a870-15d8a0db509b",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "Sidebar.tsx:footer-settings-click",
                    message: "Footer settings button clicked",
                    data: { which: "footer" },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    hypothesisId: "B",
                  }),
                },
              ).catch(() => {});
              // #endregion
              setIsSettingsOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 dark:text-gray-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
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
    </div>
  );
}
