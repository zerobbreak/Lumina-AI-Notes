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
import { Sparkles, Loader2, FileText, Crown, Lock } from "lucide-react";
import Link from "next/link";

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
  const subscription = useQuery(api.subscriptions.getSubscriptionStatus);
  const generateFlashcards = useAction(api.ai.generateAndSaveFlashcards);

  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    defaultNoteId || ""
  );
  const [cardCount, setCardCount] = useState<string>("10");
  const [title, setTitle] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  const selectedNote = notes?.find((n) => n._id === selectedNoteId);
  const isFreeTier = !subscription || subscription.tier === "free";

  const handleGenerate = async () => {
    if (!selectedNoteId) {
      setError("Please select a note");
      return;
    }

    setError(null);
    setRequiresUpgrade(false);
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
        if (result.requiresUpgrade) {
          setRequiresUpgrade(true);
        }
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

  // Show upgrade prompt for free tier users
  if (isFreeTier) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0a0a12] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <Lock className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
              </div>
              Generate Flashcards
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              AI-generated flashcards are a Scholar feature.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Upgrade Prompt */}
            <div className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-indigo-500/10 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
              
              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Upgrade to Scholar
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Get access to AI-generated flashcards, quizzes, unlimited audio processing, and more.
                  </p>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-gray-300">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Auto-generated Flashcards
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI Quiz Generation
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    Unlimited Audio Processing
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-gray-300 hover:bg-white/5"
            >
              Maybe Later
            </Button>
            <Link href="/#pricing">
              <Button className="bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 gap-2">
                <Crown className="w-4 h-4" />
                Upgrade Now
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
                    className="text-white focus:bg-indigo-600 focus:text-white cursor-pointer transition-colors my-1 group data-[state=checked]:bg-indigo-900/50 data-[state=checked]:text-indigo-200"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 group-focus:text-white opacity-70 group-focus:opacity-100 transition-all" />
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
              className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-white/10"
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
                {[5, 10, 15, 20].map((count) => (
                  <SelectItem
                    key={count}
                    value={count.toString()}
                    className="text-white focus:bg-indigo-600 focus:text-white cursor-pointer transition-colors"
                  >
                    {count} cards
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`text-sm rounded-md px-3 py-2 ${
              requiresUpgrade 
                ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20" 
                : "text-red-400 bg-red-500/10 border border-red-500/20"
            }`}>
              {error}
              {requiresUpgrade && (
                <Link href="/#pricing" className="block mt-2">
                  <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Upgrade to Scholar
                  </Button>
                </Link>
              )}
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
