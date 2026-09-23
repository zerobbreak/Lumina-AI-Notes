"use client";

import { useState } from "react";
import { useAiActions } from "@/lib/hooks/ai/useAiActions";
import { useCreateFileAction } from "@/lib/hooks/files/useCreateFileAction";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
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
import { Course, Module } from "@/types";
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
  const { data: userData } = useCurrentUser();
  const createFile = useCreateFileAction();
  const { ingestAndGenerateNote, ingestAndGenerateFlashcards } = useAiActions();

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
    await createFile({
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
      <DialogContent className="sm:max-w-[480px] bg-background border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Generate from File
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose where to store the generated content and what to create.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* File Info */}
          <div className="flex items-center gap-3 p-3 bg-foreground/5 border border-border rounded-lg">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground break-all line-clamp-2">
                {fileName}
              </p>
              <p className="text-xs text-muted-foreground/80">PDF Document</p>
            </div>
          </div>

          {/* Course Selection */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Save to Course (Optional)</Label>
            <Select
              value={selectedCourse}
              onValueChange={(val) => {
                setSelectedCourse(val);
                setSelectedModule("");
              }}
              disabled={isProcessing}
            >
              <SelectTrigger className="bg-foreground/5 border-border text-foreground w-full">
                <SelectValue placeholder="Select course (Optional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
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
                <Label className="text-muted-foreground">Module (Optional)</Label>
                <Select
                  value={selectedModule}
                  onValueChange={setSelectedModule}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-foreground/5 border-border text-foreground w-full">
                    <SelectValue placeholder="Select module (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
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
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateFlashcards}
            disabled={isProcessing}
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary/80"
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
