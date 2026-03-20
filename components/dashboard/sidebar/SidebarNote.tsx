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
  onRename: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onExpand?: () => void;
}

function SidebarNoteComponent({
  note,
  isActive,
  isDraggable = true,
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
        isDragging && "opacity-50",
      )}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {isDraggable && (
        <div className="absolute left-0 opacity-0 group-hover/note:opacity-50 cursor-grab active:cursor-grabbing transition-opacity">
          <GripVertical className="w-3 h-3 text-slate-400 dark:text-gray-500" />
        </div>
      )}
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-9 px-2.5 pr-16 text-[13px] gap-3 transition-all",
          isDraggable && "pl-5", // Extra padding for drag handle
          isActive
            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
        )}
        onClick={handleClick}
      >
        <FileText
          className={cn(
            "w-3.5 h-3.5 transition-colors shrink-0",
            isActive
              ? "text-sidebar-foreground"
              : "text-zinc-500 group-hover/note:text-zinc-400",
          )}
        />
        <span className="truncate">{note.title}</span>
        {note.quickCaptureType === "voice" && (
          <span className="ml-2 text-[9px] uppercase tracking-widest text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-sidebar-border">
            Voice
          </span>
        )}
      </Button>
      <div className="absolute right-1 transition-all flex items-center gap-1">
        {onExpand && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            title="Expand"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        )}
        <ActionMenu
          onRename={onRename}
          onDelete={onDelete}
          onArchive={onArchive}
          isArchived={note.isArchived}
        />
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent state changes
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
