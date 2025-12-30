"use client";

import { FileText } from "lucide-react";
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
  };
  isActive?: boolean;
  onRename: () => void;
  onDelete: () => void;
  onArchive?: () => void;
}

export function SidebarNote({
  note,
  isActive,
  onRename,
  onDelete,
  onArchive,
}: SidebarNoteProps) {
  const router = useRouter();

  return (
    <div className="relative group/note flex items-center">
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-9 px-2.5 text-[13px] gap-3 transition-all", // Increased gap to 3 (was 2.5 or implicit)
          isActive
            ? "bg-indigo-500/10 text-indigo-400 font-medium"
            : "text-gray-400 hover:text-white hover:bg-white/4"
        )}
        onClick={() => router.push(`/dashboard?noteId=${note._id}`)}
      >
        <FileText
          className={cn(
            "w-3.5 h-3.5 transition-colors shrink-0",
            isActive
              ? "text-indigo-400"
              : "text-amber-500/70 group-hover/note:text-amber-400"
          )}
        />
        <span className="truncate">{note.title}</span>
      </Button>
      <div className="absolute right-1 opacity-100 lg:opacity-0 lg:group-hover/note:opacity-100 transition-all">
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
