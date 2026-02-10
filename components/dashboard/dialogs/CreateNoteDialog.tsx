"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Course, Module } from "@/types";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
}: CreateNoteDialogProps) {
  const userData = useQuery(api.users.getUser);
  const { createNoteFlow, TemplateSelector } = useCreateNoteFlow();

  const [title, setTitle] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const courses = userData?.courses || [];
  const modules = selectedCourse
    ? courses.find((c: Course) => c.id === selectedCourse)?.modules || []
    : [];

  const handleCreate = async () => {
    if (!title) return;
    setIsCreating(true);
    try {
      const result = await createNoteFlow({
        title,
        major: userData?.major || "general",
        courseId: selectedCourse || undefined,
        moduleId: selectedModule || undefined,
      });
      if (result?.noteId) {
        onOpenChange(false);
        setTitle("");
        setSelectedCourse("");
        setSelectedModule("");
      }
    } catch (error) {
      console.error("Create note failed:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription className="text-gray-400">
            Start a new note and optionally link it to a course context.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-gray-400">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 bg-white/5 border-white/10 text-white focus:border-indigo-500"
              placeholder="Lecture 1: Introduction"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="course" className="text-right text-gray-400">
              Course
            </Label>
            <Select
              value={selectedCourse}
              onValueChange={(val) => {
                if (val === "none") {
                  setSelectedCourse("");
                  setSelectedModule("");
                  return;
                }
                setSelectedCourse(val);
                setSelectedModule("");
              }}
            >
              <SelectTrigger className="col-span-3 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select course (Optional)" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="none">None</SelectItem>
                {courses.map((course: Course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourse &&
            selectedCourse !== "none" &&
            modules.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="module" className="text-right text-gray-400">
                  Module
                </Label>
                <Select
                  value={selectedModule}
                  onValueChange={(val) => {
                    if (val === "none") {
                      setSelectedModule("");
                      return;
                    }
                    setSelectedModule(val);
                  }}
                >
                  <SelectTrigger className="col-span-3 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select module (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {modules.map((mod: Module) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            onClick={handleCreate}
            disabled={isCreating || !title}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Create Note
          </Button>
        </DialogFooter>
      </DialogContent>
      <TemplateSelector />
    </Dialog>
  );
}
