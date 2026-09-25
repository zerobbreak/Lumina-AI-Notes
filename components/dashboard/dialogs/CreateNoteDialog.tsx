"use client";

import { useState } from "react";
import { useUserData } from "@/lib/hooks/users/useUserData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Course } from "@/types";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
}: CreateNoteDialogProps) {
  const userData = useUserData();
  const { createNoteFlow } = useCreateNoteFlow();

  const [title, setTitle] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const courses = userData?.courses || [];

  const handleCreate = async () => {
    if (!title) return;
    setIsCreating(true);
    try {
      const result = await createNoteFlow({
        title,
        major: userData?.major || "general",
        courseId: selectedCourse || undefined,
      });
      if (result?.noteId) {
        onOpenChange(false);
        setTitle("");
        setSelectedCourse("");
      }
    } catch (error) {
      console.error("Create note failed:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Start a new note and optionally file it under a module.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-muted-foreground">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 bg-foreground/5 border-border text-foreground focus:border-primary"
              placeholder="Lecture 1: Introduction"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="course" className="text-right text-muted-foreground">
              Module
            </Label>
            <Select
              value={selectedCourse}
              onValueChange={(val) => setSelectedCourse(val === "none" ? "" : val)}
            >
              <SelectTrigger className="col-span-3 bg-foreground/5 border-border text-foreground">
                <SelectValue placeholder="Select module (Optional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="none">None</SelectItem>
                {courses.map((course: Course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code ? `${course.code} - ` : ""}{course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !title}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Create Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
