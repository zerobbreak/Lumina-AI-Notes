"use client";

import { useState, useMemo } from "react";
import { Folder } from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotesByContextData } from "@/lib/hooks/notes/useNotesByContextData";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { Id } from "@/types/data-model";
import { SidebarNote } from "./SidebarNote";
import { SidebarRow, SidebarRowGroup } from "./SidebarRow";
import { usePersistedDisclosure } from "./usePersistedDisclosure";
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
  const searchParams = useSearchParams();
  const { isOpen, toggle, setIsOpen } = usePersistedDisclosure(`module.${module.id}`, false);
  const [isDragOver, setIsDragOver] = useState(false);

  const activeNoteId = searchParams.get("noteId");
  const isActive = searchParams.get("contextId") === module.id;

  const moduleNotes = useNotesByContextData({ moduleId: module.id });

  const rootModuleNotes = useMemo(
    () => moduleNotes?.filter((n) => !n.parentNoteId),
    [moduleNotes],
  );

  const { moveNoteToFolder } = useNoteActions();

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
    if (!noteId) return;

    try {
      await moveNoteToFolder({
        noteId: noteId as Id<"notes">,
        courseId: courseId,
        moduleId: module.id,
      });
      toast.success(`Moved "${noteTitle}" to ${module.title}`);
      setIsOpen(true);
    } catch (error) {
      console.error("Failed to move note:", error);
      toast.error("Failed to move note");
    }
  };

  return (
    <div>
      <SidebarRow
        label={module.title}
        icon={<Folder className="h-[14px] w-[14px]" />}
        isActive={isActive}
        isDropTarget={isDragOver}
        onClick={() => router.push(`/dashboard?contextId=${module.id}&contextType=module`)}
        meta={isDragOver ? "Drop to move" : rootModuleNotes?.length || undefined}
        disclosure={{ isOpen, onToggle: toggle }}
        dragProps={{ onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop }}
        actions={
          <ActionMenu
            onRename={() => onRename(module.id, module.title, courseId)}
            onDelete={() => onDelete(module.id, courseId)}
          />
        }
      />

      {isOpen && (
        <SidebarRowGroup className="mt-px">
          {rootModuleNotes?.length ? (
            rootModuleNotes.map((note) => (
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
