"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAiActions } from "@/lib/hooks/ai/useAiActions";
import { useRecentNotes } from "@/lib/queries/notes/useRecentNotes";
import { Id } from "@/types/data-model";
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
  const { data: notes } = useRecentNotes();
  const { generateAndSaveQuiz: generateQuiz } = useAiActions();

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
      <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Quiz
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            AI will create multiple-choice questions from your note content to test your knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Note Selection */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-foreground/80">
              Select Note
            </Label>
            <Select value={selectedNoteId} onValueChange={handleNoteChange}>
              <SelectTrigger className="bg-foreground/5 border-border text-foreground">
                <SelectValue placeholder="Choose a note..." />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {notes?.map((note) => (
                  <SelectItem
                    key={note._id}
                    value={note._id}
                    className="text-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer transition-colors my-1 group data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary group-focus:text-foreground opacity-70 group-focus:opacity-100 transition-all" />
                      <span className="truncate">{note.title}</span>
                    </div>
                  </SelectItem>
                ))}
                {(!notes || notes.length === 0) && (
                  <div className="px-2 py-4 text-center text-muted-foreground/80 text-sm">
                    No notes found. Create a note first!
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quiz Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground/80">
              Quiz Title
            </Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title..."
              className="w-full px-3 py-2 rounded-md bg-foreground/5 border border-border text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-foreground/10"
            />
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <Label htmlFor="count" className="text-foreground/80">
              Number of Questions
            </Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="bg-foreground/5 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {[5, 10, 15, 20].map((count) => (
                  <SelectItem
                    key={count}
                    value={count.toString()}
                    className="text-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer transition-colors"
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
            className="border-border text-foreground/80 hover:bg-foreground/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedNoteId}
            className="bg-linear-to-r from-primary to-primary-alt hover:from-primary/90 hover:to-primary-alt/90 gap-2"
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
