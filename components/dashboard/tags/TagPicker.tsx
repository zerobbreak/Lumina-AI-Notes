"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
  const tags = useQuery(api.tags.getTags);
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
                ? "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
                : "text-gray-400 hover:text-white hover:bg-white/10",
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
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 border border-indigo-500/20">
                {selectedTagIds.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2 bg-[#111] border border-white/10 text-white"
          align={align}
        >
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 pb-1">
              Select Tags
            </h4>

            {tags?.length === 0 && (
              <div className="text-center py-3 text-gray-500 text-xs">
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
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
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

            <div className="pt-2 border-t border-white/10 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-gray-400 hover:text-white hover:bg-white/5 font-normal"
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
