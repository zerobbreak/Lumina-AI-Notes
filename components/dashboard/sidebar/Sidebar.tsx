"use client";

import {
  Search,
  Settings,
  Library,
  BookOpen,
  GraduationCap,
  FileText,
  ChevronRight,
  ChevronDown,
  Command,
  Plus,
  Folder,
  File,
  Upload,
  Layers,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SearchDialog } from "@/components/dashboard/search/SearchDialog";
import { Course, Module, UserFile } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";
import { CreateNoteDialog } from "@/components/dashboard/dialogs/CreateNoteDialog";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { useDashboard } from "@/hooks/useDashboard";
import { DraggableDocument, DocumentStatusBadge } from "@/components/documents";

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
  const recentNotes = useQuery(api.notes.getRecentNotes);
  const recentFiles = useQuery(api.files.getFiles);

  // Mutations
  const deleteNote = useMutation(api.notes.deleteNote);
  const renameNote = useMutation(api.notes.renameNote);
  const toggleArchiveNote = useMutation(api.notes.toggleArchiveNote);

  const createCourse = useMutation(api.users.createCourse);
  const renameCourse = useMutation(api.users.renameCourse);
  const deleteCourse = useMutation(api.users.deleteCourse);

  const addModule = useMutation(api.users.addModuleToCourse);
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
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
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

  const openRename = (target: RenameTarget) => setRenameTarget(target);

  // Notes
  const handleCreateNote = () => setIsCreateNoteOpen(true);

  // Courses
  const handleCreateCourse = async () => {
    try {
      await createCourse({ name: "New Course", code: "CSE 101" });
    } catch (e) {
      console.error(e);
    }
  };

  // Modules
  const handleCreateModule = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addModule({ courseId, title: "New Module" });
      setExpandedCourses((prev) => ({ ...prev, [courseId]: true }));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLeftSidebarOpen) return null;

  return (
    <div className="w-[280px] h-screen bg-[#050505]/80 backdrop-blur-2xl border-r border-white/6 flex flex-col shrink-0 z-50 relative group/sidebar shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="flex items-center gap-3.5 p-2 rounded-xl bg-white/3 border border-white/5 hover:bg-white/6 hover:border-white/8 transition-all duration-300 cursor-pointer group shadow-sm">
          <div className="w-9 h-9 bg-linear-to-br from-indigo-500 via-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.5)] transition-shadow">
            <span className="drop-shadow-md">U</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-semibold text-white text-[13px] tracking-wide truncate group-hover:text-indigo-100 transition-colors">
              University of Tech
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium truncate">
                {userData?.onboardingComplete ? "Pro Plan" : "Free"}
              </p>
            </div>
          </div>
          <Settings className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
        </div>

        {/* Search */}
        <Button
          variant="ghost"
          className="w-full justify-between bg-black/40 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20 h-10 px-3 transition-all duration-200"
          onClick={() => setIsSearchOpen(true)}
        >
          <span className="flex items-center gap-2.5 text-xs font-medium">
            <Search className="w-3.5 h-3.5 opacity-70" />
            <span className="opacity-80">Search notes...</span>
          </span>
          <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-[4px] border border-white/5 text-gray-300">
            ⌘K
          </span>
        </Button>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        {/* COURSES */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-gray-400">
              Smart Folders
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all rounded-md"
              onClick={handleCreateCourse}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {userData?.courses?.map((course: Course) => {
              const isExpanded = expandedCourses[course.id];
              return (
                <div key={course.id} className="space-y-1 relative group/item">
                  <div className="relative flex items-center">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-9 px-2.5 text-[13px] font-medium transition-all duration-200 border-l-2 gap-2.5",
                        isExpanded
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500"
                          : "border-transparent text-gray-400 hover:text-white hover:bg-white/4"
                      )}
                    >
                      {/* Toggle Button */}
                      <div
                        className={cn(
                          "p-0.5 rounded-md transition-colors",
                          isExpanded
                            ? "text-indigo-400"
                            : "text-gray-500 hover:bg-white/10 hover:text-gray-300"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCourse(course.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Title Link */}
                      <span
                        className="truncate flex-1 text-left cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/dashboard?contextId=${course.id}&contextType=course`
                          )
                        }
                      >
                        {course.code}
                      </span>
                    </Button>
                    <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-all duration-200">
                      <ActionMenu
                        onRename={() =>
                          openRename({
                            id: course.id,
                            type: "course",
                            name: course.name,
                          })
                        }
                        onDelete={() => deleteCourse({ courseId: course.id })}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-4 space-y-0.5 ml-2 border-l border-white/5">
                      {course.modules?.map((mod: Module) => (
                        <div
                          key={mod.id}
                          className="relative group/module flex items-center"
                        >
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-8 px-2 text-[12px] text-gray-500 hover:text-indigo-200 hover:bg-indigo-500/5 gap-2.5 transition-all"
                            onClick={() =>
                              router.push(
                                `/dashboard?contextId=${mod.id}&contextType=module`
                              )
                            }
                          >
                            <Folder
                              className={cn(
                                "w-3.5 h-3.5",
                                "text-indigo-500/50 group-hover/module:text-indigo-400"
                              )}
                            />
                            <span className="truncate">{mod.title}</span>
                          </Button>
                          <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/module:opacity-100 transition-all">
                            <ActionMenu
                              onRename={() =>
                                openRename({
                                  id: mod.id,
                                  type: "module",
                                  name: mod.title,
                                  parentId: course.id,
                                })
                              }
                              onDelete={() =>
                                deleteModule({
                                  courseId: course.id,
                                  moduleId: mod.id,
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-8 px-2 text-[11px] text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/5 gap-2 transition-all ml-0.5"
                        onClick={(e) => handleCreateModule(course.id, e)}
                      >
                        <Plus className="w-3 h-3" /> Add Module
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {(!userData?.courses || userData.courses.length === 0) && (
              <div className="px-3 py-2 text-xs text-gray-600 italic bg-white/2 rounded-lg border border-white/2">
                No courses yet.
              </div>
            )}
          </div>
        </div>

        {/* FILES */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-gray-400">
              Resource Library
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all rounded-md"
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
              >
                <div className="relative group/file flex items-center">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-9 px-2.5 text-[13px] text-gray-400 hover:text-white hover:bg-white/4 gap-2.5 transition-all"
                  >
                    <File className="w-3.5 h-3.5 text-blue-500/70 group-hover/file:text-blue-400 transition-colors" />
                    <span className="truncate flex-1">{file.name}</span>
                    <DocumentStatusBadge status={file.processingStatus} />
                  </Button>
                  <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/file:opacity-100 transition-all">
                    <ActionMenu
                      onRename={() =>
                        openRename({
                          id: file._id,
                          type: "file",
                          name: file.name,
                        })
                      }
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
              <div className="px-3 py-2 text-xs text-gray-600 italic bg-white/2 rounded-lg border border-white/2">
                No files uploaded.
              </div>
            )}
          </div>
        </div>

        {/* NOTES */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-gray-400">
              Quick Notes
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all rounded-md"
              onClick={handleCreateNote}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {recentNotes?.map((note) => (
              <div
                key={note._id}
                className="relative group/note flex items-center"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 px-2.5 text-[13px] text-gray-400 hover:text-white hover:bg-white/4 gap-2.5 transition-all"
                  onClick={() => router.push(`/dashboard?noteId=${note._id}`)}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500/70 group-hover/note:text-amber-400 transition-colors" />
                  <span className="truncate">{note.title}</span>
                </Button>
                <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/note:opacity-100 transition-all">
                  <ActionMenu
                    onRename={() =>
                      openRename({
                        id: note._id,
                        type: "note",
                        name: note.title,
                      })
                    }
                    onDelete={() => deleteNote({ noteId: note._id })}
                    onArchive={() => toggleArchiveNote({ noteId: note._id })}
                    isArchived={note.isArchived}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FLASHCARDS */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-[0.2em] transition-colors group-hover:text-gray-400">
              Study Tools
            </h3>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start h-9 px-2.5 text-[13px] text-gray-400 hover:text-white hover:bg-white/4 gap-2.5 transition-all group"
            onClick={() => router.push("/dashboard?view=flashcards")}
          >
            <div className="p-0.5 rounded bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
              <Layers className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
            </div>
            <span>Flashcards</span>
          </Button>
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-white/6 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 pt-1 group cursor-pointer">
          <div className="relative">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 rounded-xl ring-2 ring-white/5",
                },
              }}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#121212] rounded-full"></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-medium text-white truncate group-hover:text-gray-200 transition-colors">
              {user?.fullName}
            </p>
            <p className="text-[11px] text-gray-500 truncate group-hover:text-gray-400 transition-colors">
              Student Account
            </p>
          </div>
          <Settings className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
        </div>
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
      <CreateNoteDialog
        open={isCreateNoteOpen}
        onOpenChange={setIsCreateNoteOpen}
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
    </div>
  );
}
