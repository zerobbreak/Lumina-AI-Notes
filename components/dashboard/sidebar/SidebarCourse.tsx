"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus, FolderOpen } from "lucide-react";
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
  isCompact?: boolean;
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
  isCompact = false,
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
    <div className={cn("space-y-0.5 relative group/item px-1", isCompact && "px-0")}>
      <div className="relative flex items-center group/course">
        <div
          className={cn(
            "flex-1 flex items-center h-8 px-2 text-[13px] font-medium transition-all duration-200 gap-2 cursor-pointer rounded-lg",
            isDragOver
              ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
              : isExpanded && !isCompact
                ? "bg-zinc-800/50 text-sidebar-foreground"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-zinc-800/30",
            isCompact && "w-10 h-10 justify-center px-0"
          )}
          onClick={handleCourseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          title={isCompact ? course.name : undefined}
        >
          {/* Toggle Button */}
          {!isCompact && (
            <div
              className={cn(
                "p-0.5 rounded-md transition-colors",
                isExpanded
                  ? "text-indigo-400"
                  : "text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300",
              )}
              onClick={handleToggleClick}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </div>
          )}

          {/* Title Text or Icon */}
          {isCompact ? (
            <FolderOpen className={cn(
              "w-4 h-4 transition-colors",
              isExpanded ? "text-indigo-400" : "text-zinc-500"
            )} />
          ) : (
            <span className="truncate flex-1 tracking-tight">{course.code}</span>
          )}

          {/* Drop indicator */}
          {isDragOver && !isCompact && (
            <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200 animate-pulse">
              Drop
            </span>
          )}
        </div>

        {/* Action Menu */}
        {!isCompact && (
          <div className="absolute right-2 opacity-0 group-hover/course:opacity-100 transition-opacity">
            <ActionMenu onRename={handleRename} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {isExpanded && !isCompact && (
        <div className="pl-3 space-y-0.5 ml-3 border-l border-white/5">
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
            className="w-full justify-start h-7 px-2 text-[11px] text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/5 gap-2 transition-all rounded-md"
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
