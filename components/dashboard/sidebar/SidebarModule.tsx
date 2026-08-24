"use client";

import { useState, useMemo } from "react";
import { Folder, ChevronRight, ChevronDown } from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { SidebarNote } from "./SidebarNote";
import { toast } from "sonner";

interface SidebarModuleProps {
  module: {
    id: string;
    title: string;
  };
  courseId: string;
  onRename: (id: string, name: string, parentId: string) => void;
  onDelete: (id: string, parentId: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
}

export function SidebarModule({
  module,
  courseId,
  onRename,
  onDelete,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: SidebarModuleProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const moduleNotes = useQuery(api.notes.getNotesByContext, {
    moduleId: module.id,
  });

  const rootModuleNotes = useMemo(
    () => moduleNotes?.filter((n) => !n.parentNoteId),
    [moduleNotes],
  );

  const moveNoteToFolder = useMutation(api.notes.moveNoteToFolder);

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
          courseId: courseId,
          moduleId: module.id,
        });
        toast.success(`Moved "${noteTitle}" to ${module.title}`);
        setIsExpanded(true);
      } catch (error) {
        console.error("Failed to move note:", error);
        toast.error("Failed to move note");
      }
    }
  };

  return (
    <div className="relative group/module">
      <div className="flex items-center">
        <div
          className={cn(
            "flex-1 flex items-center h-[28px] px-2 text-[12px] gap-1.5 transition-colors cursor-pointer rounded-md",
            isDragOver
              ? "text-primary bg-primary/10 ring-1 ring-primary/20"
              : "text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
          )}
          onClick={() => {
            router.push(`/dashboard?contextId=${module.id}&contextType=module`);
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div
            className="p-0.5 rounded-sm text-muted-foreground/35 hover:text-muted-foreground/60 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-2.5 h-2.5" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5" />
            )}
          </div>

          <Folder
            className={cn(
              "w-3.5 h-3.5 shrink-0 transition-colors",
              isDragOver
                ? "text-primary/70"
                : "text-muted-foreground/30",
            )}
          />
          <span className="truncate flex-1">{module.title}</span>

          {isDragOver && (
            <span className="text-[9px] bg-primary/10 px-1 py-0.5 rounded text-primary/70 animate-pulse">
              Drop
            </span>
          )}
        </div>

        <div className="absolute right-1 opacity-0 group-hover/module:opacity-100 transition-opacity">
          <ActionMenu
            onRename={() => onRename(module.id, module.title, courseId)}
            onDelete={() => onDelete(module.id, courseId)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="ml-[14px] pl-2.5 border-l border-sidebar-border/30 space-y-px mt-px">
          {rootModuleNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              isDraggable={false}
              onRename={() => onRenameNote(note._id, note.title)}
              onDelete={() => onDeleteNote(note._id)}
              onArchive={() => onArchiveNote(note._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
