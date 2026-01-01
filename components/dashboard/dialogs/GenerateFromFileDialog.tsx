"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { FileText, Sparkles, Brain } from "lucide-react";
import { Course, Module } from "@/lib/types";
import { useRouter } from "next/navigation";

interface GenerateFromFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  storageId: string;
  defaultCourseId?: string;
  onComplete?: () => void;
}

export function GenerateFromFileDialog({
  open,
  onOpenChange,
  fileName,
  storageId,
  defaultCourseId,
  onComplete,
}: GenerateFromFileDialogProps) {
  const router = useRouter();
  const userData = useQuery(api.users.getUser);
  const uploadFile = useMutation(api.files.uploadFile);
  const ingestAndGenerateNote = useAction(api.ai.ingestAndGenerateNote);
  const ingestAndGenerateFlashcards = useAction(
    api.ai.ingestAndGenerateFlashcards
  );

  const [selectedCourse, setSelectedCourse] = useState<string>(
    defaultCourseId || ""
  );
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<
    "note" | "flashcards" | null
  >(null);

  const courses = userData?.courses || [];
  const modules = selectedCourse
    ? courses.find((c: Course) => c.id === selectedCourse)?.modules || []
    : [];

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      setTimeout(() => {
        if (!defaultCourseId) setSelectedCourse("");
        setSelectedModule("");
      }, 300);
    }
  };

  const saveFileToLibrary = async () => {
    // Save the file to the files table
    await uploadFile({
      name: fileName,
      type: "pdf",
      storageId,
      courseId:
        selectedCourse && selectedCourse !== "none"
          ? selectedCourse
          : undefined,
    });
  };

  const handleGenerateNote = async () => {
    setIsProcessing(true);
    setProcessingMode("note");

    try {
      // Save file to library first
      await saveFileToLibrary();

      // Generate notes
      const result = await ingestAndGenerateNote({
        storageId,
        fileName,
        courseId:
          selectedCourse && selectedCourse !== "none"
            ? selectedCourse
            : undefined,
      });

      if (result.success && result.noteId) {
        toast.success(`Created notes from "${fileName}"`);
        handleClose();
        onComplete?.();
        router.push(`/dashboard?noteId=${result.noteId}`);
      } else {
        toast.error(result.error || "Failed to generate notes");
      }
    } catch (error) {
      console.error("Note generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate notes"
      );
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsProcessing(true);
    setProcessingMode("flashcards");

    try {
      // Save file to library first
      await saveFileToLibrary();

      // Generate flashcards
      const result = await ingestAndGenerateFlashcards({
        storageId,
        fileName,
        courseId:
          selectedCourse && selectedCourse !== "none"
            ? selectedCourse
            : undefined,
      });

      if (result.success) {
        toast.success(
          `Created ${result.cardCount} flashcards from "${fileName}"`
        );
        handleClose();
        onComplete?.();
      } else {
        toast.error(result.error || "Failed to generate flashcards");
      }
    } catch (error) {
      console.error("Flashcard generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate flashcards"
      );
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Generate from File
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose where to store the generated content and what to create.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* File Info */}
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white break-all line-clamp-2">
                {fileName}
              </p>
              <p className="text-xs text-gray-500">PDF Document</p>
            </div>
          </div>

          {/* Course Selection */}
          <div className="space-y-2">
            <Label className="text-gray-400">Save to Course (Optional)</Label>
            <Select
              value={selectedCourse}
              onValueChange={(val) => {
                setSelectedCourse(val);
                setSelectedModule("");
              }}
              disabled={isProcessing}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                <SelectValue placeholder="Select course (Optional)" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="none">No Course</SelectItem>
                {courses.map((course: Course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Module Selection (if course has modules) */}
          {selectedCourse &&
            selectedCourse !== "none" &&
            modules.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-400">Module (Optional)</Label>
                <Select
                  value={selectedModule}
                  onValueChange={setSelectedModule}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                    <SelectValue placeholder="Select module (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    <SelectItem value="none">No Module</SelectItem>
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateFlashcards}
            disabled={isProcessing}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
          >
            {processingMode === "flashcards" ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Flashcards
              </>
            )}
          </Button>
          <Button
            onClick={handleGenerateNote}
            disabled={isProcessing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {processingMode === "note" ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Note
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
