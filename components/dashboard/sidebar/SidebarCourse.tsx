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

  const rootCourseNotes = useMemo(
    () => courseNotes?.filter((note) => !note.moduleId),
    [courseNotes],
  );

  return (
    <div className={cn("relative group/item", isCompact && "px-0")}>
      <div className="relative flex items-center group/course">
        <div
          className={cn(
            "flex-1 flex items-center h-[30px] px-2 text-[13px] font-medium transition-colors gap-1.5 cursor-pointer rounded-md",
            isDragOver
              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
              : "text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
            isCompact && "w-9 h-9 justify-center px-0"
          )}
          onClick={handleCourseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          title={isCompact ? course.name : undefined}
        >
          {!isCompact && (
            <div
              className="p-0.5 rounded-sm transition-colors text-muted-foreground/40 hover:text-muted-foreground/70"
              onClick={handleToggleClick}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </div>
          )}

          {isCompact ? (
            <FolderOpen className={cn(
              "w-[15px] h-[15px] transition-colors",
              isExpanded ? "text-sidebar-foreground/70" : "text-muted-foreground/40"
            )} />
          ) : (
            <span className="truncate flex-1">{course.code}</span>
          )}

          {isDragOver && !isCompact && (
            <span className="text-[9px] bg-primary/10 px-1 py-0.5 rounded text-primary/70 animate-pulse">
              Drop
            </span>
          )}
        </div>

        {!isCompact && (
          <div className="absolute right-1 opacity-0 group-hover/course:opacity-100 transition-opacity">
            <ActionMenu onRename={handleRename} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {isExpanded && !isCompact && (
        <div className="ml-[18px] pl-2.5 border-l border-sidebar-border/40 space-y-px mt-px">
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

          <button
            className="w-full flex items-center h-[26px] px-2 text-[12px] text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-sidebar-accent/30 gap-1.5 transition-colors rounded-md"
            onClick={handleCreateModule}
          >
            <Plus className="w-3 h-3" /> Add module
          </button>
        </div>
      )}
    </div>
  );
}

export const SidebarCourse = memo(SidebarCourseComponent);
