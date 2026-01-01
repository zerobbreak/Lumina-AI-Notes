"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Course, Module } from "@/lib/types";
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

export function SidebarCourse({
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

  const handleCreateModule = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addModule({ courseId: course.id, title: "New Module" });
      if (!isExpanded) onToggle();
    } catch (e) {
      console.error(e);
    }
  };

  // Drop zone handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("application/lumina-note-id")) {
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
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
  };

  // Filter notes that don't belong to any module
  const rootCourseNotes = courseNotes?.filter((note) => !note.moduleId);

  return (
    <div className="space-y-1 relative group/item">
      <div className="relative flex items-center group/course">
        <div
          className={cn(
            "flex-1 flex items-center h-9 px-2.5 text-[13px] font-medium transition-all duration-200 border-l-2 gap-2 cursor-pointer",
            isDragOver
              ? "bg-indigo-500/30 text-indigo-300 border-indigo-400 ring-1 ring-indigo-400/50"
              : isExpanded
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500 hover:bg-indigo-500/20 hover:text-indigo-300"
                : "border-transparent text-gray-400 hover:text-white hover:bg-white/4"
          )}
          onClick={() =>
            router.push(`/dashboard?contextId=${course.id}&contextType=course`)
          }
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
              onToggle();
            }}
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
          <ActionMenu
            onRename={() => onRename(course.id, course.name)}
            onDelete={() => onDelete(course.id)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="pl-4 space-y-0.5 ml-2 border-l border-white/5">
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
            className="w-full justify-start h-8 px-2 text-[11px] text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/5 gap-2 transition-all ml-0.5"
            onClick={handleCreateModule}
          >
            <Plus className="w-3 h-3" /> Add Module
          </Button>
        </div>
      )}
    </div>
  );
}
