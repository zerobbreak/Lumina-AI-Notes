"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { SidebarNote } from "./SidebarNote";

interface SidebarTagProps {
  tag: {
    _id: Id<"tags">;
    name: string;
    color: string;
    count: number;
  };
  onRename: (id: Id<"tags">, name: string) => void;
  onDelete: (id: Id<"tags">) => void;
  onRenameNote: (id: string, title: string) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
}

export function SidebarTag({
  tag,
  onRename,
  onDelete,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: SidebarTagProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const tagNotes = useQuery(
    api.notes.getNotesByTag,
    isExpanded ? { tagId: tag._id } : "skip",
  );

  return (
    <div className="relative group/tag">
      <div className="flex items-center">
        <button
          type="button"
          className={cn(
            "flex-1 flex items-center h-[28px] px-2 text-[12px] gap-1.5 transition-colors cursor-pointer rounded-md",
            "text-muted-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
          )}
          onClick={() => setIsExpanded((v) => !v)}
        >
          <span className="text-muted-foreground/35">
            {isExpanded ? (
              <ChevronDown className="w-2.5 h-2.5" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5" />
            )}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <span className="truncate flex-1 text-left">{tag.name}</span>
          <span className="text-[10px] text-muted-foreground/40 font-mono">
            {tag.count}
          </span>
        </button>

        <div className="absolute right-1 opacity-0 group-hover/tag:opacity-100 transition-opacity">
          <ActionMenu
            onRename={() => onRename(tag._id, tag.name)}
            onDelete={() => onDelete(tag._id)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="ml-[22px] space-y-px mt-px">
          {tagNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              isDraggable={false}
              onRename={() => onRenameNote(note._id, note.title)}
              onDelete={() => onDeleteNote(note._id)}
              onArchive={() => onArchiveNote(note._id)}
            />
          ))}
          {tagNotes && tagNotes.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-muted-foreground/40">
              No notes yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
