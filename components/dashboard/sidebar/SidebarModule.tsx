"use client";

import { useState } from "react";
import { Folder, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { SidebarNote } from "./SidebarNote";

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

  // Fetch notes for this module
  const moduleNotes = useQuery(api.notes.getNotesByContext, {
    moduleId: module.id,
  });

  return (
    <div className="relative group/module">
      <div className="flex items-center">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-8 px-2 text-[12px] gap-3 transition-all", // Increased gap
            isExpanded
              ? "text-indigo-300 bg-indigo-500/5"
              : "text-gray-500 hover:text-white hover:bg-white/5"
          )}
          onClick={() => {
            // If we're clicking the button (not the expander), we navigate
            // But we also want to toggle expansion if clicking the folder icon?
            // Standard behavior: click main body -> navigate, click chevron -> toggle
            // Here we don't have a chevron for modules in the original design, but adding one might be good if it has content?
            // The original design just had the folder icon. Let's make the whole thing toggle if it has notes, otherwise navigation.
            // Actually, better UX: Single click navigates to module context, but we also need a way to see children.
            // Let's adding a small chevron if there are notes, or just default to expanded if active?
            // For now, let's keep it simple: Click toggles expansion AND navigates? Or just click navigates.
            // Wait, the original Sidebar didn't have notes under modules. We are adding them.
            // So we need a toggle.
            setIsExpanded(!isExpanded);
            router.push(`/dashboard?contextId=${module.id}&contextType=module`);
          }}
        >
          <div
            className="p-0.5 rounded-md hover:bg-white/10 text-gray-500 cursor-pointer mr-1"
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
              "text-indigo-500/50 group-hover/module:text-indigo-400"
            )}
          />
          <span className="truncate flex-1 text-left">{module.title}</span>
        </Button>
        <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/module:opacity-100 transition-all">
          <ActionMenu
            onRename={() => onRename(module.id, module.title, courseId)}
            onDelete={() => onDelete(module.id, courseId)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="pl-4 ml-2 border-l border-white/5 space-y-0.5 mt-0.5">
          {moduleNotes?.map((note) => (
            <SidebarNote
              key={note._id}
              note={note}
              onRename={() => onRenameNote(note._id, note.title)}
              onDelete={() => onDeleteNote(note._id)}
              onArchive={() => onArchiveNote(note._id)}
            />
          ))}
          {/* We could add a "Create Note" button here specific to module if needed */}
        </div>
      )}
    </div>
  );
}
