"use client";

import { useState, useCallback, memo } from "react";
import { FileText, GripVertical, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

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
  onExpand?: () => void;
}

function SidebarNoteComponent({
  note,
  isActive,
  isDraggable = true,
  isCompact = false,
  onRename,
  onDelete,
  onArchive,
  onExpand,
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

  return (
    <div
      className={cn(
        "relative group/note flex items-center",
        isDragging && "opacity-40",
        isCompact && "px-0"
      )}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <button
        className={cn(
          "w-full flex items-center h-[30px] px-2 text-[13px] gap-2 transition-colors rounded-md relative",
          isActive
            ? "bg-sidebar-accent/60 text-sidebar-foreground font-medium"
            : "text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
          isCompact && "w-9 h-9 justify-center px-0"
        )}
        onClick={handleClick}
        title={isCompact ? note.title : undefined}
      >
        {isDraggable && !isCompact && (
          <div className="absolute left-0.5 opacity-0 group-hover/note:opacity-30 cursor-grab active:cursor-grabbing transition-opacity">
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <FileText
          className={cn(
            "w-[14px] h-[14px] shrink-0 transition-colors",
            isActive
              ? "text-sidebar-foreground/70"
              : "text-muted-foreground/40",
          )}
        />
        {!isCompact && (
          <span className="truncate flex-1 text-left">{note.title}</span>
        )}
        {note.quickCaptureType === "voice" && !isCompact && (
          <span className="text-[9px] font-semibold uppercase tracking-tight text-primary/60 bg-primary/8 px-1 py-0.5 rounded shrink-0">
            Voice
          </span>
        )}
      </button>
      {!isCompact && (
        <div className="absolute right-1 opacity-0 group-hover/note:opacity-100 transition-opacity flex items-center gap-0.5">
          {onExpand && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-muted-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
            >
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          )}
          <ActionMenu
            onRename={onRename}
            onDelete={onDelete}
            onArchive={onArchive}
            isArchived={note.isArchived}
          />
        </div>
      )}
    </div>
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
      prevProps.isDraggable === nextProps.isDraggable
    );
  },
);
