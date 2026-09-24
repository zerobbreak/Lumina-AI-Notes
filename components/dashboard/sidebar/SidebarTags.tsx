"use client";

import { useState } from "react";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { Id } from "@/types/data-model";
import { useNotesByContextData } from "@/lib/hooks/notes/useNotesByContextData";
import { cn } from "@/lib/utils";
import { SidebarNote } from "./SidebarNote";
import { SidebarRow, SidebarRowGroup } from "./SidebarRow";

type Tag = {
  _id: Id<"tags">;
  name: string;
  color: string;
  count: number;
};

interface SidebarTagsProps {
  tags: readonly Tag[];
  activeNoteId: string | null;
  onRename: (id: Id<"tags">, name: string) => void;
  onDelete: (id: Id<"tags">) => void;
  onRenameNote: (id: string, title: string) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
}

/**
 * Tags as wrapping chips. Picking one opens it underneath: a row with its
 * menu, then its notes. One tag is open at a time.
 */
export function SidebarTags({ tags, activeNoteId, ...handlers }: SidebarTagsProps) {
  const [openId, setOpenId] = useState<Id<"tags"> | null>(null);
  const openTag = tags.find((t) => t._id === openId) ?? null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1 px-1.5 py-0.5">
        {tags.map((tag) => {
          const isOpen = tag._id === openId;
          return (
            <button
              key={tag._id}
              type="button"
              aria-pressed={isOpen}
              onClick={() => setOpenId(isOpen ? null : tag._id)}
              className={cn(
                "flex h-[22px] max-w-full items-center gap-1.5 rounded-full border px-2 text-[11.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isOpen
                  ? "border-sidebar-foreground/25 bg-sidebar-accent text-sidebar-foreground"
                  : "border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="truncate">{tag.name}</span>
              {tag.count > 0 && <span className="tabular-nums opacity-55">{tag.count}</span>}
            </button>
          );
        })}
      </div>

      {openTag && <OpenTag key={openTag._id} tag={openTag} activeNoteId={activeNoteId} onClose={() => setOpenId(null)} {...handlers} />}
    </div>
  );
}

function OpenTag({
  tag,
  activeNoteId,
  onClose,
  onRename,
  onDelete,
  onRenameNote,
  onDeleteNote,
  onArchiveNote,
}: Omit<SidebarTagsProps, "tags"> & { tag: Tag; onClose: () => void }) {
  const notes = useNotesByContextData({ tagId: tag._id });

  return (
    <div>
      <SidebarRow
        label={tag.name}
        icon={<span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />}
        isActive
        onClick={onClose}
        ariaLabel={`Close ${tag.name}`}
        meta={tag.count}
        actions={
          <ActionMenu
            onRename={() => onRename(tag._id, tag.name)}
            onDelete={() => {
              onClose();
              onDelete(tag._id);
            }}
          />
        }
      />
      <SidebarRowGroup className="mt-px">
        {notes === undefined ? (
          <p className="px-2 py-1 text-[12px] text-muted-foreground/70">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="px-2 py-1 text-[12px] text-muted-foreground/70">No notes yet</p>
        ) : (
          notes.map((note) => (
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
        )}
      </SidebarRowGroup>
    </div>
  );
}
