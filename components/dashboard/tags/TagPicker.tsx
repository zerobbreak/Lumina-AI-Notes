"use client";

import { Id } from "@/types/data-model";
import { useTagsWithCounts } from "@/lib/queries/tags/useTagsWithCounts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TagManagerDialog } from "./TagManagerDialog";

interface TagPickerProps {
  selectedTagIds: Id<"tags">[];
  onTagToggle: (tagId: Id<"tags">) => void;
  className?: string;
  align?: "start" | "center" | "end";
}

export function TagPicker({
  selectedTagIds,
  onTagToggle,
  className,
  align = "start",
}: TagPickerProps) {
  const { data: tags } = useTagsWithCounts();
  const [open, setOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-2 transition-colors",
              selectedTagIds.length > 0
                ? "text-primary bg-primary/10 hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/10",
              className,
            )}
            title="Manage Tags"
          >
            <TagIcon
              className={cn(
                "w-3.5 h-3.5",
                selectedTagIds.length > 0 && "fill-current",
              )}
            />
            <span className="hidden sm:inline">Tags</span>
            {selectedTagIds.length > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 border border-primary/20">
                {selectedTagIds.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2 bg-background border border-border text-foreground"
          align={align}
        >
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest px-2 pb-1">
              Select Tags
            </h4>

            {tags?.length === 0 && (
              <div className="text-center py-3 text-muted-foreground/80 text-xs">
                No tags available
              </div>
            )}

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-0.5">
              {tags?.map((tag) => {
                const isSelected = selectedTagIds.includes(tag._id);
                return (
                  <button
                    key={tag._id}
                    onClick={() => onTagToggle(tag._id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-left transition-colors group text-sm",
                      isSelected
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground/90",
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate">{tag.name}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 font-normal"
                onClick={() => {
                  setOpen(false);
                  setIsManagerOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-2" />
                Create / Manage Tags
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <TagManagerDialog open={isManagerOpen} onOpenChange={setIsManagerOpen} />
    </>
  );
}
