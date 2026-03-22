"use client";

import { useState } from "react";
import { Folder, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    id: string; // This is a string UUID from the schema, not a Convex ID
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

  // Fetch notes for this module
  const moduleNotes = useQuery(api.notes.getNotesByContext, {
    moduleId: module.id,
  });

  const moveNoteToFolder = useMutation(api.notes.moveNoteToFolder);

  // Drop zone handlers
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
        // Auto-expand the module to show the new note
        setIsExpanded(true);
      } catch (error) {
        console.error("Failed to move note:", error);
        toast.error("Failed to move note");
      }
    }
  };

  return (
    <div className="relative group/module px-1">
      <div className="flex items-center">
        <div
          className={cn(
            "flex-1 flex items-center h-7 px-2 text-[12px] gap-2 transition-all cursor-pointer rounded-md",
            isDragOver
              ? "text-indigo-200 bg-indigo-500/20 ring-1 ring-indigo-500/30"
              : isExpanded
                ? "text-sidebar-foreground bg-zinc-800/30"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-zinc-800/20",
          )}
          onClick={() => {
            router.push(`/dashboard?contextId=${module.id}&contextType=module`);
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Toggle Button */}
          <div
            className="p-1 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </div>

          <Folder
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isDragOver
                ? "text-indigo-400"
                : "text-indigo-500/50 group-hover/module:text-indigo-400 transition-colors",
            )}
          />
          <span className="truncate flex-1 tracking-tight">{module.title}</span>

          {/* Drop indicator */}
          {isDragOver && (
            <span className="text-[9px] bg-indigo-500/30 px-1 py-0.5 rounded text-indigo-200 animate-pulse">
              Drop
            </span>
          )}
        </div>

        {/* Action Menu */}
        <div className="absolute right-2 opacity-0 group-hover/module:opacity-100 transition-opacity">
          <ActionMenu
            onRename={() => onRename(module.id, module.title, courseId)}
            onDelete={() => onDelete(module.id, courseId)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="pl-3 ml-3 border-l border-white/5 space-y-0.5 mt-0.5">
          {moduleNotes?.map((note) => (
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
