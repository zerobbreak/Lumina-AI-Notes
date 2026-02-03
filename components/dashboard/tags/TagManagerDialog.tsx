"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Tag as TagIcon, X } from "lucide-react";
import { toast } from "sonner";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Gray", value: "#71717a" },
];

export function TagManagerDialog({
  open,
  onOpenChange,
}: TagManagerDialogProps) {
  const tags = useQuery(api.tags.getTags);
  const createTag = useMutation(api.tags.createTag);
  const deleteTag = useMutation(api.tags.deleteTag);

  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[8].value); // Indigo default
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    try {
      setIsCreating(true);
      await createTag({ name: newTagName.trim(), color: selectedColor });
      setNewTagName("");
      toast.success("Tag created");
    } catch (e: any) {
      // Display specific error if available, else generic
      if (e.message.includes("exists")) {
        toast.error("Tag with this name already exists");
      } else {
        toast.error("Failed to create tag");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (tagId: Id<"tags">) => {
    try {
      await deleteTag({ tagId });
      toast.success("Tag deleted");
    } catch (e) {
      toast.error("Failed to delete tag");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Tag */}
          <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/5">
            <Label className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
              New Tag
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name (e.g., Important)"
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500/50"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newTagName.trim()}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {/* Color Picker */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`w-5 h-5 rounded-full transition-all border border-transparent ${
                    selectedColor === color.value
                      ? "ring-2 ring-white scale-110"
                      : "opacity-70 hover:opacity-100 hover:border-white/20"
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* Existing Tags */}
          <div className="space-y-3">
            <Label className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
              Your Tags
            </Label>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {tags?.map((tag) => (
                <div
                  key={tag._id}
                  className="flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/8 transition-colors border border-white/5 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-gray-200">{tag.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => handleDelete(tag._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {tags?.length === 0 && (
                <div className="flex flex-col items-center justify-center p-6 text-gray-500 border border-dashed border-white/10 rounded-lg">
                  <TagIcon className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-sm text-center">
                    No tags yet.
                    <br />
                    Create one above!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="hover:bg-white/10 text-gray-400 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
