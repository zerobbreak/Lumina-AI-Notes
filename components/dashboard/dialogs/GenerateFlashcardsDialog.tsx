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

interface GenerateFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultNoteId?: string;
}

export function GenerateFlashcardsDialog({
  open,
  onOpenChange,
  defaultNoteId,
}: GenerateFlashcardsDialogProps) {
  const router = useRouter();
  const notes = useQuery(api.notes.getRecentNotes);
  const generateFlashcards = useAction(api.ai.generateAndSaveFlashcards);

  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    defaultNoteId || ""
  );
  const [cardCount, setCardCount] = useState<string>("10");
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
      const result = await generateFlashcards({
        noteId: selectedNoteId as Id<"notes">,
        title: title || selectedNote?.title || "Flashcard Deck",
        count: parseInt(cardCount),
      });

      if (result.success && result.deckId) {
        onOpenChange(false);
        // Navigate to the new deck
        router.push(`/dashboard?view=flashcards&deckId=${result.deckId}`);
      } else {
        setError(result.error || "Failed to generate flashcards");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate flashcards"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNoteChange = (noteId: string) => {
    setSelectedNoteId(noteId);
    const note = notes?.find((n) => n._id === noteId);
    if (note && !title) {
      setTitle(`${note.title} Flashcards`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a12] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Generate Flashcards
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            AI will create flashcards from your note content to help you study.
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
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-yellow-500/70" />
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

          {/* Deck Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">
              Deck Title
            </Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter deck title..."
              className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Card Count */}
          <div className="space-y-2">
            <Label htmlFor="count" className="text-gray-300">
              Number of Cards
            </Label>
            <Select value={cardCount} onValueChange={setCardCount}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a12] border-white/10">
                <SelectItem value="5" className="text-white hover:bg-white/10">
                  5 cards
                </SelectItem>
                <SelectItem value="10" className="text-white hover:bg-white/10">
                  10 cards
                </SelectItem>
                <SelectItem value="15" className="text-white hover:bg-white/10">
                  15 cards
                </SelectItem>
                <SelectItem value="20" className="text-white hover:bg-white/10">
                  20 cards
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
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
            className="bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 gap-2"
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
