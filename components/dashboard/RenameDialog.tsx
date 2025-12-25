"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  title: string;
  onConfirm: (newValue: string) => Promise<void>;
}

export function RenameDialog({
  open,
  onOpenChange,
  initialValue,
  title,
  onConfirm,
}: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, open]);

  const handleConfirm = async () => {
    if (!value || value === initialValue) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(value);
      onOpenChange(false);
    } catch (error) {
      console.error("Rename failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle>Rename {title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter a new name for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-gray-400">
              Name
            </Label>
            <Input
              id="name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="col-span-3 bg-white/5 border-white/10 text-white focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !value}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSaving ? "Saving..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
