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
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ActionMenu } from "./ActionMenu";
import { UploadDialog } from "./UploadDialog";
import { CreateNoteDialog } from "./CreateNoteDialog";
import { RenameDialog } from "./RenameDialog";

type RenameTarget = {
  id: string;
  type: "note" | "course" | "module" | "file";
  name: string;
  parentId?: string; // For modules (courseId)
};

export function Sidebar() {
  const { user } = useUser();
  const router = useRouter();

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

  // Local State
  const [expandedCourses, setExpandedCourses] = useState<
    Record<string, boolean>
  >({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);

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
        await renameNote({ noteId: id as any, title: newValue });
      else if (type === "file")
        await renameFile({ fileId: id as any, name: newValue });
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

  return (
    <div className="w-[260px] h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 z-50 relative group/sidebar">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            U
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-semibold text-white text-sm truncate">
              University of Tech
            </h2>
            <p className="text-[10px] text-gray-500 truncate group-hover:text-gray-400">
              Pro Plan
            </p>
          </div>
          <Settings className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
        </div>
        <Button
          variant="outline"
          className="w-full justify-between bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 h-9"
        >
          <span className="flex items-center gap-2 text-xs">
            <Search className="w-3.5 h-3.5" />
            Search
          </span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/5">
            ⌘K
          </span>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* COURSES */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Smart Folders
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-4 h-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCreateCourse}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {userData?.courses?.map((course: any) => {
              const isExpanded = expandedCourses[course.id];
              return (
                <div key={course.id} className="space-y-1 relative group/item">
                  <div className="relative flex items-center">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-9 px-2 text-sm font-medium hover:bg-white/5 pr-8 gap-0", // gap-0 to control spacing manually
                        isExpanded
                          ? "text-indigo-400"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      {/* Toggle Button */}
                      <div
                        className="p-1 mr-1 hover:bg-white/10 rounded cursor-pointer"
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
                    <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-opacity">
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
                    <div className="pl-6 space-y-0.5 border-l border-white/5 ml-3.5">
                      {course.modules?.map((mod: any) => (
                        <div
                          key={mod.id}
                          className="relative group/module flex items-center"
                        >
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-8 px-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 gap-2 pr-8"
                            onClick={() =>
                              router.push(
                                `/dashboard?contextId=${mod.id}&contextType=module`
                              )
                            }
                          >
                            <Folder className="w-3 h-3" />
                            <span className="truncate">{mod.title}</span>
                          </Button>
                          <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/module:opacity-100 transition-opacity">
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
                        className="w-full justify-start h-7 px-2 text-[10px] text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 gap-2"
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
              <div className="px-2 text-xs text-gray-600 italic">
                No courses.
              </div>
            )}
          </div>
        </div>

        {/* FILES */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Resource Library
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-4 h-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {recentFiles?.map((file: any) => (
              <div
                key={file._id}
                className="relative group/file flex items-center"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 gap-2.5 pr-8"
                >
                  <File className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate">{file.name}</span>
                </Button>
                <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/file:opacity-100 transition-opacity">
                  <ActionMenu
                    onRename={() =>
                      openRename({
                        id: file._id,
                        type: "file",
                        name: file.name,
                      })
                    }
                    onDelete={() => deleteFile({ fileId: file._id })}
                  />
                </div>
              </div>
            ))}
            {(!recentFiles || recentFiles.length === 0) && (
              <div className="px-2 text-xs text-gray-600 italic">No files.</div>
            )}
          </div>
        </div>

        {/* NOTES */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Notes
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="w-4 h-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCreateNote}
            >
              <Plus className="w-3 h-3" />
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
                  className="w-full justify-start h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 gap-2.5 pr-8"
                  onClick={() => router.push(`/dashboard?noteId=${note._id}`)}
                >
                  <FileText className="w-3.5 h-3.5 text-yellow-500/50" />
                  <span className="truncate">{note.title}</span>
                </Button>
                <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/note:opacity-100 transition-opacity">
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
      </ScrollArea>

      <div className="p-4 border-t border-white/5 bg-black/40">
        <div className="flex items-center gap-3 pt-2">
          <UserButton
            appearance={{ elements: { avatarBox: "w-8 h-8 rounded-lg" } }}
          />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-gray-500 truncate">Student</p>
          </div>
        </div>
      </div>

      <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
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
    </div>
  );
}
