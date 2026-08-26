"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus, FileText, Hash } from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { shouldShowCourseCode } from "@/lib/courseDisplay";
import { Course, Module } from "@/types";
import { CourseRowIcon } from "./CourseRowIcon";
import { SidebarModule } from "./SidebarModule";
import { SidebarNote } from "./SidebarNote";
import { toast } from "sonner";

interface SidebarCourseProps {
  course: Course;
  isExpanded: boolean;
  isCompact?: boolean;
  /** All course codes on the account — used to hide duplicate placeholder chips. */
  peerCodes?: readonly string[];
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
  peerCodes = [],
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
  const searchParams = useSearchParams();
  const [isDragOver, setIsDragOver] = useState(false);

  const activeNoteId = searchParams.get("noteId");
  const isActive = searchParams.get("contextId") === course.id;

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
    () =>
      courseNotes?.filter((note) => !note.moduleId && !note.parentNoteId),
    [courseNotes],
  );

  const noteCount = useMemo(
    () =>
      courseNotes?.filter((note) => !note.isArchived && !note.parentNoteId)
        .length ?? 0,
    [courseNotes],
  );

  const showCode = shouldShowCourseCode(course.code, peerCodes);

  return (
    <div className={cn("relative group/item", isCompact && "px-0")}>
      <div className="relative flex items-center group/course">
        <div
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex-1 flex items-center h-7 px-2 text-[13px] font-medium transition-colors duration-100 gap-1.5 cursor-pointer rounded-md",
            isDragOver
              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
              : isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            isCompact && "w-8 h-8 justify-center px-0"
          )}
          onClick={handleCourseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          title={isCompact ? course.name : undefined}
        >
          {isActive && !isDragOver && (
            <span
              aria-hidden
              className="absolute inset-y-1 left-0 w-[2px] rounded-r-full bg-primary"
            />
          )}
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
            <CourseRowIcon
              name={course.name}
              code={course.code}
              isActive={isActive}
            />
          ) : (
            <>
              <CourseRowIcon
                name={course.name}
                code={course.code}
                isActive={isActive || isDragOver}
              />
              <span className="min-w-0 flex-1 truncate">{course.name}</span>
              {showCode && (
                <span
                  className={cn(
                    "inline-flex max-w-[4.5rem] shrink-0 items-center gap-0.5 rounded border px-1 py-px",
                    isActive
                      ? "border-sidebar-border/70 bg-sidebar-accent/40"
                      : "border-sidebar-border/40 bg-sidebar-accent/20",
                  )}
                  title={`Course code: ${course.code}`}
                >
                  <Hash className="h-2 w-2 shrink-0 text-muted-foreground/50" />
                  <span className="truncate font-mono text-[9px] leading-none text-muted-foreground/70">
                    {course.code}
                  </span>
                </span>
              )}
              {!isDragOver && (
                <span
                  className="ml-auto flex shrink-0 items-center gap-0.5 tabular-nums text-[10px] text-muted-foreground/45 transition-opacity group-hover/course:opacity-0"
                  title={`${noteCount} note${noteCount === 1 ? "" : "s"}`}
                >
                  <FileText className="h-3 w-3 shrink-0" aria-hidden />
                  {noteCount}
                </span>
              )}
            </>
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
              isActive={note._id === activeNoteId}
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
