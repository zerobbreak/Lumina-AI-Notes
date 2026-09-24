"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { Plus } from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotesByContextData } from "@/lib/hooks/notes/useNotesByContextData";
import { useCourseActions } from "@/lib/hooks/mutations/useCourseActions";
import { useRecolorCourse } from "@/lib/mutations/courses/useRecolorCourse";
import type { AccentSwatch } from "@/lib/appearance/model";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { Id } from "@/types/data-model";
import { Course, Module } from "@/types";
import { CourseTile } from "./CourseTile";
import { SidebarModule } from "./SidebarModule";
import { SidebarNote } from "./SidebarNote";
import { SidebarRow, SidebarRowGroup } from "./SidebarRow";
import { usePersistedDisclosure } from "./usePersistedDisclosure";
import { toast } from "sonner";

interface SidebarCourseProps {
  course: Course;
  isCompact?: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRenameModule: (id: string, name: string, parentId: string) => void;
  onDeleteModule: (id: string, parentId: string) => void;
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
  onRenameModule,
  onDeleteModule,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: SidebarCourseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDragOver, setIsDragOver] = useState(false);
  const { isOpen, toggle, setIsOpen } = usePersistedDisclosure(`course.${course.id}`, false);

  const activeNoteId = searchParams.get("noteId");
  const isActive = searchParams.get("contextId") === course.id;

  const courseNotes = useNotesByContextData({ courseId: course.id });

  const { addModuleToCourse } = useCourseActions();
  const { moveNoteToFolder } = useNoteActions();
  const { mutate: recolorCourse } = useRecolorCourse();

  const handleRecolor = useCallback(
    (color: AccentSwatch) =>
      recolorCourse(
        { courseId: course.id, color },
        { onError: () => toast.error("Couldn't change the course colour") },
      ),
    [recolorCourse, course.id],
  );

  const handleCreateModule = useCallback(async () => {
    try {
      await addModuleToCourse({ courseId: course.id, title: "New Module" });
      setIsOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't add a module");
    }
  }, [addModuleToCourse, course.id, setIsOpen]);

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

  const rootCourseNotes = useMemo(
    () => courseNotes?.filter((note) => !note.moduleId && !note.parentNoteId),
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
          <>
            <button
              type="button"
              onClick={handleCreateModule}
              aria-label={`Add a module to ${course.name}`}
              title="Add module"
              className="flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Plus className="h-3 w-3" />
            </button>
            <ActionMenu
              onRename={() => onRename(course.id, course.name)}
              onDelete={() => onDelete(course.id)}
              color={course.color}
              onColorChange={handleRecolor}
            />
          </>
        }
      />

      {isOpen && (
        <SidebarRowGroup className="mt-px">
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

          <SidebarRow
            label="Add module"
            icon={<Plus className="h-[13px] w-[13px]" />}
            isMuted
            onClick={handleCreateModule}
          />
        </SidebarRowGroup>
      )}
    </div>
  );
}

export const SidebarCourse = memo(SidebarCourseComponent);
