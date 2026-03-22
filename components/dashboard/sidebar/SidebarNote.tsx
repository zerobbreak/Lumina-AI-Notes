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
        "relative group/note flex items-center px-1",
        isDragging && "opacity-50",
        isCompact && "px-0"
      )}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-8 px-2 text-[13px] gap-2.5 transition-all rounded-lg relative overflow-hidden group/btn",
          isActive
            ? "bg-indigo-500/10 text-indigo-400 font-medium ring-1 ring-indigo-500/20"
            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-zinc-800/50",
          isCompact && "w-10 h-10 justify-center px-0"
        )}
        onClick={handleClick}
        title={isCompact ? note.title : undefined}
      >
        {isDraggable && !isCompact && (
          <div className="absolute left-0 opacity-0 group-hover/note:opacity-40 cursor-grab active:cursor-grabbing transition-opacity">
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <FileText
          className={cn(
            "w-3.5 h-3.5 transition-colors shrink-0",
            isActive
              ? "text-indigo-400"
              : "text-zinc-500 group-hover/btn:text-zinc-300",
          )}
        />
        {!isCompact && <span className="truncate flex-1 text-left">{note.title}</span>}
        {note.quickCaptureType === "voice" && !isCompact && (
          <span className="text-[9px] font-bold uppercase tracking-tighter text-indigo-400/80 bg-indigo-500/10 px-1 py-0.5 rounded shrink-0">
            Voice
          </span>
        )}
      </Button>
      {!isCompact && (
        <div className="absolute right-2 opacity-0 group-hover/note:opacity-100 transition-all flex items-center gap-0.5">
          {onExpand && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md"
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
