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
import { ACCENT_INFO } from "@/lib/appearance/catalog";
import type { AccentSwatch } from "@/lib/appearance/model";
import { cn } from "@/lib/utils";

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
  /** Shows a colour row at the top when set, e.g. for a course. */
  color?: AccentSwatch;
  onColorChange?: (color: AccentSwatch) => void;
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
  color,
  onColorChange,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground/80 hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align === "right" ? "end" : "start"}
        side="bottom"
        className="w-32 p-1 bg-popover border-border z-9999"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5">
          {onColorChange && (
            <>
              <div className="grid grid-cols-5 gap-1.5 px-2 py-1.5" role="radiogroup" aria-label="Colour">
                {ACCENT_INFO.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={color === a.id}
                    aria-label={a.label}
                    title={a.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(a.id);
                    }}
                    className={cn(
                      "h-4 w-4 rounded-full ring-offset-1 ring-offset-popover transition-transform",
                      color === a.id ? "ring-2 ring-foreground/60" : "hover:scale-110",
                    )}
                    style={{ background: `hsl(${a.swatch})` }}
                  />
                ))}
              </div>
              <div className="h-px bg-border my-1" />
            </>
          )}
          {onGenerateFlashcards && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateFlashcards();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-primary hover:bg-primary dark:hover:bg-primary/10 rounded-md w-full text-left"
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
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-primary hover:bg-primary dark:hover:bg-primary/10 rounded-md w-full text-left"
            >
              <Sparkles className="w-3 h-3" />
              Take a Quiz
            </button>
          )}

          {(onGenerateFlashcards || onGenerateQuiz) && (
            <div className="h-px bg-border my-1" />
          )}
          {onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-md w-full text-left"
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
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-md w-full text-left"
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
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-md w-full text-left"
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
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/10 rounded-md w-full text-left"
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
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-md w-full text-left"
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
