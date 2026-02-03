"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Course, Module } from "@/types";
import { SidebarModule } from "./SidebarModule";
import { SidebarNote } from "./SidebarNote";
import { toast } from "sonner";

interface SidebarCourseProps {
  course: Course;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRenameModule: (id: string, name: string, parentId: string) => void;
  onDeleteModule: (id: string, parentId: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
}

function SidebarCourseComponent({
  course,
  isExpanded,
  onToggle,
  onRename,
  onDelete,
  onRenameModule,
  onDeleteModule,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: SidebarCourseProps) {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch notes strictly for this course (not in a module)
  const courseNotes = useQuery(api.notes.getNotesByContext, {
    courseId: course.id,
  });

  const addModule = useMutation(api.users.addModuleToCourse);
  const moveNoteToFolder = useMutation(api.notes.moveNoteToFolder);

  const handleCreateModule = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await addModule({ courseId: course.id, title: "New Module" });
        if (!isExpanded) onToggle();
      } catch (e) {
        console.error(e);
      }
    },
    [addModule, course.id, isExpanded, onToggle],
  );

  // Drop zone handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("application/lumina-note-id")) {
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const noteId = e.dataTransfer.getData("application/lumina-note-id");
      const noteTitle = e.dataTransfer.getData("application/lumina-note-title");

      if (noteId) {
        try {
          await moveNoteToFolder({
            noteId: noteId as Id<"notes">,
            courseId: course.id,
          });
          toast.success(`Moved "${noteTitle}" to ${course.name}`);
        } catch (error) {
          console.error("Failed to move note:", error);
          toast.error("Failed to move note");
        }
      }
    },
    [moveNoteToFolder, course.id, course.name],
  );

  const handleCourseClick = useCallback(() => {
    router.push(`/dashboard?contextId=${course.id}&contextType=course`);
  }, [router, course.id]);

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  const handleRename = useCallback(() => {
    onRename(course.id, course.name);
  }, [onRename, course.id, course.name]);

  const handleDelete = useCallback(() => {
    onDelete(course.id);
  }, [onDelete, course.id]);

  // Filter notes that don't belong to any module - memoized
  const rootCourseNotes = useMemo(
    () => courseNotes?.filter((note) => !note.moduleId),
    [courseNotes],
  );

  return (
    <div className="space-y-1 relative group/item">
      <div className="relative flex items-center group/course">
        <div
          className={cn(
            "flex-1 flex items-center h-9 px-2.5 text-[13px] font-medium transition-all duration-200 border-l-2 gap-2 cursor-pointer",
            isDragOver
              ? "bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border-indigo-400 ring-1 ring-indigo-400/50"
              : isExpanded
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500 hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300"
                : "border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/4",
          )}
          onClick={handleCourseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Toggle Button */}
          <div
            className={cn(
              "p-0.5 rounded-md transition-colors",
              isExpanded
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-300",
            )}
            onClick={handleToggleClick}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Title Text */}
          <span className="truncate flex-1">{course.code}</span>

          {/* Drop indicator */}
          {isDragOver && (
            <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200">
              Drop here
            </span>
          )}
        </div>

        {/* Action Menu - Absolute Positioned */}
        <div className="absolute right-1 opacity-0 group-hover/course:opacity-100 transition-opacity">
          <ActionMenu onRename={handleRename} onDelete={handleDelete} />
        </div>
      </div>

      {isExpanded && (
        <div className="pl-4 space-y-0.5 ml-2 border-l border-slate-200 dark:border-white/5">
          {/* MODULES */}
          {course.modules?.map((mod: Module) => (
            <SidebarModule
              key={mod.id}
              module={mod}
              courseId={course.id}
              onRename={onRenameModule}
              onDelete={onDeleteModule}
              onRenameNote={onRenameNote}
              onDeleteNote={onDeleteNote}
              onArchiveNote={onArchiveNote}
            />
          ))}

          {/* COURSE NOTES (ROOT) */}
          {rootCourseNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              isDraggable={false}
              onRename={() => onRenameNote(note._id, note.title)}
              onDelete={() => onDeleteNote(note._id)}
              onArchive={() => onArchiveNote(note._id)}
            />
          ))}

          {/* ADD MODULE BUTTON */}
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-[11px] text-slate-500 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 gap-2 transition-all ml-0.5"
            onClick={handleCreateModule}
          >
            <Plus className="w-3 h-3" /> Add Module
          </Button>
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const SidebarCourse = memo(SidebarCourseComponent);
