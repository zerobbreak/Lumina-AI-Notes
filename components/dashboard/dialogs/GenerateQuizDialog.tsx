"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, FileText } from "lucide-react";

interface GenerateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultNoteId?: string;
}

export function GenerateQuizDialog({
  open,
  onOpenChange,
  defaultNoteId,
}: GenerateQuizDialogProps) {
  const router = useRouter();
  const notes = useQuery(api.notes.getRecentNotes);
  const generateQuiz = useAction(api.ai.generateAndSaveQuiz);

  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    defaultNoteId || ""
  );
  const [questionCount, setQuestionCount] = useState<string>("10");
  const [title, setTitle] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedNote = notes?.find((n) => n._id === selectedNoteId);

  const handleGenerate = async () => {
    if (!selectedNoteId) {
      setError("Please select a note");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateQuiz({
        noteId: selectedNoteId as Id<"notes">,
        title: title || selectedNote?.title || "Quiz",
        count: parseInt(questionCount),
      });

      if (result.success && result.deckId) {
        onOpenChange(false);
        // Navigate to the new quiz
        router.push(`/dashboard?view=quizzes&deckId=${result.deckId}`);
      } else {
        setError(result.error || "Failed to generate quiz");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNoteChange = (noteId: string) => {
    setSelectedNoteId(noteId);
    const note = notes?.find((n) => n._id === noteId);
    if (note && !title) {
      setTitle(`${note.title} Quiz`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a12] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Generate Quiz
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            AI will create multiple-choice questions from your note content to test your knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Note Selection */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-gray-300">
              Select Note
            </Label>
            <Select value={selectedNoteId} onValueChange={handleNoteChange}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose a note..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a12] border-white/10">
                {notes?.map((note) => (
                  <SelectItem
                    key={note._id}
                    value={note._id}
                    className="text-white focus:bg-purple-600 focus:text-white cursor-pointer transition-colors my-1 group data-[state=checked]:bg-purple-900/50 data-[state=checked]:text-purple-200"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400 group-focus:text-white opacity-70 group-focus:opacity-100 transition-all" />
                      <span className="truncate">{note.title}</span>
                    </div>
                  </SelectItem>
                ))}
                {(!notes || notes.length === 0) && (
                  <div className="px-2 py-4 text-center text-gray-500 text-sm">
                    No notes found. Create a note first!
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quiz Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">
              Quiz Title
            </Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title..."
              className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all hover:bg-white/10"
            />
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <Label htmlFor="count" className="text-gray-300">
              Number of Questions
            </Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a12] border-white/10">
                {[5, 10, 15, 20].map((count) => (
                  <SelectItem
                    key={count}
                    value={count.toString()}
                    className="text-white focus:bg-purple-600 focus:text-white cursor-pointer transition-colors"
                  >
                    {count} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm rounded-md px-3 py-2 text-red-400 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="border-white/10 text-gray-300 hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedNoteId}
            className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
