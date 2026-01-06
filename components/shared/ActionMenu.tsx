import { useState } from "react";
import {
  MoreHorizontal,
  Trash2,
  Pencil,
  Archive,
  RefreshCw,
  Pin,
  PinOff,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ActionMenuProps {
  onRename?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onPin?: () => void;
  onGenerateFlashcards?: () => void;
  onGenerateQuiz?: () => void;
  onRetry?: () => void;
  isArchived?: boolean;
  isPinned?: boolean;
  showRetry?: boolean;
  align?: "right" | "left";
}

export function ActionMenu({
  onRename,
  onDelete,
  onArchive,
  onPin,
  onGenerateFlashcards,
  onGenerateQuiz,
  onRetry,
  isArchived,
  isPinned,
  showRetry,
  align = "right",
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-500 hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align === "right" ? "end" : "start"}
        side="bottom"
        className="w-32 p-1 bg-[#0A0A0A] border-white/10 z-9999"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5">
          {onGenerateFlashcards && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateFlashcards();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded-md w-full text-left"
            >
              <GraduationCap className="w-3 h-3" />
              Generate Flashcards
            </button>
          )}

          {onGenerateQuiz && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateQuiz();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded-md w-full text-left"
            >
              <Sparkles className="w-3 h-3" />
              Take a Quiz
            </button>
          )}

          {(onGenerateFlashcards || onGenerateQuiz) && (
            <div className="h-px bg-white/10 my-1" />
          )}
          {onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md w-full text-left"
            >
              <Pencil className="w-3 h-3" />
              Rename
            </button>
          )}

          {onPin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md w-full text-left"
            >
              {isPinned ? (
                <>
                  <PinOff className="w-3 h-3" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="w-3 h-3" />
                  Pin
                </>
              )}
            </button>
          )}

          {onArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md w-full text-left"
            >
              <Archive className="w-3 h-3" />
              {isArchived ? "Unarchive" : "Archive"}
            </button>
          )}

          {showRetry && onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 rounded-md w-full text-left"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md w-full text-left"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
