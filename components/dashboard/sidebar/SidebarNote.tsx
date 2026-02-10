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
    quickCaptureType?: "text" | "voice";
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
            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
            : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/4",
        )}
        onClick={handleClick}
      >
        <FileText
          className={cn(
            "w-3.5 h-3.5 transition-colors shrink-0",
            isActive
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-amber-600 dark:text-amber-500/70 group-hover/note:text-amber-500 dark:group-hover/note:text-amber-400",
          )}
        />
        <span className="truncate">{note.title}</span>
        {note.quickCaptureType === "voice" && (
          <span className="ml-2 text-[9px] uppercase tracking-widest text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
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
