"use client";

import { useState, useCallback, memo } from "react";
import { FileText } from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { Id } from "@/types/data-model";
import { cn } from "@/lib/utils";
import { preloadView } from "@/components/dashboard/viewLoaders";
import { usePrefetchNote } from "@/lib/queries/notes/useNoteDetail";
import { SidebarRow } from "./SidebarRow";

interface SidebarNoteProps {
  note: {
    _id: Id<"notes">;
    title: string;
    isArchived?: boolean;
    isShared?: boolean;
    isPinned?: boolean;
    noteType?: string;
    quickCaptureType?: string;
  };
  isActive?: boolean;
  isDraggable?: boolean;
  isCompact?: boolean;
  onRename: () => void;
  onDelete: () => void;
  onArchive?: () => void;
}

function SidebarNoteComponent({
  note,
  isActive = false,
  isDraggable = true,
  isCompact = false,
  onRename,
  onDelete,
  onArchive,
}: SidebarNoteProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/lumina-note-id", note._id);
      e.dataTransfer.setData("application/lumina-note-title", note.title);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
    },
    [note._id, note.title],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    router.push(`/dashboard?noteId=${note._id}`);
  }, [router, note._id]);

  // Fetch the editor chunk and the note while the pointer is on its way to
  // clicking, so the editor opens on data it already has.
  const prefetchNote = usePrefetchNote();
  const handlePrefetch = useCallback(() => {
    if (isActive) return;
    preloadView("note");
    prefetchNote(note._id);
  }, [isActive, prefetchNote, note._id]);

  const isVoice = note.quickCaptureType === "voice";

  return (
    <SidebarRow
      label={note.title}
      icon={<FileText className={isCompact ? "h-[15px] w-[15px]" : "h-[14px] w-[14px]"} />}
      isActive={isActive}
      isRail={isCompact}
      onClick={handleClick}
      onPrefetch={handlePrefetch}
      className={cn(isDragging && "opacity-40")}
      meta={
        isVoice ? (
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-tight text-primary/80">
            Voice
          </span>
        ) : undefined
      }
      actions={
        <ActionMenu
          onRename={onRename}
          onDelete={onDelete}
          onArchive={onArchive}
          isArchived={note.isArchived}
        />
      }
      dragProps={
        isDraggable
          ? { draggable: true, onDragStart: handleDragStart, onDragEnd: handleDragEnd }
          : undefined
      }
    />
  );
}

export const SidebarNote = memo(
  SidebarNoteComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.note._id === nextProps.note._id &&
      prevProps.note.title === nextProps.note.title &&
      prevProps.note.isArchived === nextProps.note.isArchived &&
      prevProps.note.quickCaptureType === nextProps.note.quickCaptureType &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isDraggable === nextProps.isDraggable &&
      prevProps.isCompact === nextProps.isCompact
    );
  },
);
