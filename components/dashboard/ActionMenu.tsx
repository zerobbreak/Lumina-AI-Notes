"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, Pencil, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionMenuProps {
  onRename?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  isArchived?: boolean;
  align?: "right" | "left";
}

export function ActionMenu({
  onRename,
  onDelete,
  onArchive,
  isArchived,
  align = "right",
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const close = () => setIsOpen(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-gray-500 hover:text-white"
        onClick={toggle}
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop for click outside */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          />

          {/* Menu */}
          <div
            className={`absolute ${
              align === "right" ? "right-0" : "left-0"
            } top-full mt-1 w-32 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-xl z-50 p-1 flex flex-col gap-0.5 overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {onRename && (
              <button
                onClick={() => {
                  onRename();
                  close();
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md w-full text-left"
              >
                <Pencil className="w-3 h-3" />
                Rename
              </button>
            )}

            {onArchive && (
              <button
                onClick={() => {
                  onArchive();
                  close();
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md w-full text-left"
              >
                <Archive className="w-3 h-3" />
                {isArchived ? "Unarchive" : "Archive"}
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  close();
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md w-full text-left"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
