"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotesByContextData } from "@/lib/hooks/notes/useNotesByContextData";
import { useRecolorCourse } from "@/lib/mutations/courses/useRecolorCourse";
import type { AccentSwatch } from "@/lib/appearance/model";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { Id } from "@/types/data-model";
import { Course } from "@/types";
import { CourseTile } from "./CourseTile";
import { SidebarNote } from "./SidebarNote";
import { SidebarRow, SidebarRowGroup } from "./SidebarRow";
import { usePersistedDisclosure } from "./usePersistedDisclosure";
import { toast } from "sonner";

interface SidebarCourseProps {
  course: Course;
  isCompact?: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
}

const NOTE_MIME = "application/lumina-note-id";

function SidebarCourseComponent({
  course,
  isCompact = false,
  onRename,
  onDelete,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: SidebarCourseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDragOver, setIsDragOver] = useState(false);
  const { isOpen, toggle } = usePersistedDisclosure(`course.${course.id}`, false);

  const activeNoteId = searchParams.get("noteId");
  const isActive = searchParams.get("contextId") === course.id;

  const courseNotes = useNotesByContextData({ courseId: course.id });

  const { moveNoteToFolder } = useNoteActions();
  const { mutate: recolorCourse } = useRecolorCourse();

  const handleRecolor = useCallback(
    (color: AccentSwatch) =>
      recolorCourse(
        { courseId: course.id, color },
        { onError: () => toast.error("Couldn't change the module colour") },
      ),
    [recolorCourse, course.id],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes(NOTE_MIME)) {
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

      const noteId = e.dataTransfer.getData(NOTE_MIME);
      const noteTitle = e.dataTransfer.getData("application/lumina-note-title");
      if (!noteId) return;

      try {
        await moveNoteToFolder({ noteId: noteId as Id<"notes">, courseId: course.id });
        toast.success(`Moved "${noteTitle}" to ${course.name}`);
      } catch (error) {
        console.error("Failed to move note:", error);
        toast.error("Failed to move note");
      }
    },
    [moveNoteToFolder, course.id, course.name],
  );

  const openCourse = useCallback(() => {
    router.push(`/dashboard?contextId=${course.id}&contextType=course`);
  }, [router, course.id]);

  // Modules used to hold sub-modules; notes filed in one still carry its
  // moduleId, so list every top-level note regardless.
  const rootNotes = useMemo(
    () => courseNotes?.filter((note) => !note.parentNoteId),
    [courseNotes],
  );

  const noteCount = useMemo(
    () => courseNotes?.filter((note) => !note.isArchived && !note.parentNoteId).length ?? 0,
    [courseNotes],
  );

  const tile = (
    <CourseTile name={course.name} code={course.code} color={course.color} size={isCompact ? "rail" : "row"} />
  );

  if (isCompact) {
    return <SidebarRow isRail label={course.name} icon={tile} isActive={isActive} onClick={openCourse} />;
  }

  return (
    <div>
      <SidebarRow
        label={course.name}
        icon={tile}
        isActive={isActive}
        isDropTarget={isDragOver}
        onClick={openCourse}
        meta={isDragOver ? "Drop to move" : noteCount || undefined}
        disclosure={{ isOpen, onToggle: toggle }}
        dragProps={{ onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop }}
        actions={
          <ActionMenu
            onRename={() => onRename(course.id, course.name)}
            onDelete={() => onDelete(course.id)}
            color={course.color}
            onColorChange={handleRecolor}
          />
        }
      />

      {isOpen && (
        <SidebarRowGroup className="mt-px">
          {rootNotes?.length ? (
            rootNotes.map((note) => (
              <SidebarNote
                key={note._id}
                note={note}
                isActive={note._id === activeNoteId}
                isDraggable={false}
                onRename={() => onRenameNote(note._id, note.title)}
                onDelete={() => onDeleteNote(note._id)}
                onArchive={() => onArchiveNote(note._id)}
              />
            ))
          ) : (
            <p className="px-2 py-1 text-[12px] text-muted-foreground/70">No notes yet</p>
          )}
        </SidebarRowGroup>
      )}
    </div>
  );
}

export const SidebarCourse = memo(SidebarCourseComponent);
