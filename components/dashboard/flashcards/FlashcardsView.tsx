"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers, Plus, Trash2, Clock, BookOpen, Sparkles } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { FlashcardDeck } from "@/types";
import { useState } from "react";
import { GenerateFlashcardsDialog } from "@/components/dashboard/dialogs/GenerateFlashcardsDialog";

export function FlashcardsView() {
  const router = useRouter();
  const decks = useQuery(api.flashcards.getDecks);
  const deleteDeck = useMutation(api.flashcards.deleteDeck);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const handleStudyDeck = (deckId: string) => {
    router.push(`/dashboard?view=flashcards&deckId=${deckId}`);
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this deck?")) {
      await deleteDeck({ deckId: deckId as Id<"flashcardDecks"> });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-[#050505] to-[#0a0a12]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-white/10">
            <Layers className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Flashcards</h1>
            <p className="text-sm text-gray-500">
              Study and memorize your notes
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsGenerateOpen(true)}
          className="gap-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
        >
          <Sparkles className="w-4 h-4" />
          Generate from Notes
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {decks === undefined ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex items-center gap-2 text-gray-500 animate-pulse">
              <Layers className="w-5 h-5" />
              <span>Loading decks...</span>
            </div>
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="p-4 rounded-full bg-white/5 mb-4">
              <Layers className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No flashcard decks yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mb-4">
              Generate flashcards from your notes to start studying and
              memorizing key concepts.
            </p>
            <Button
              onClick={() => setIsGenerateOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Deck
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck: FlashcardDeck) => (
              <div
                key={deck._id}
                onClick={() => handleStudyDeck(deck._id)}
                className="group relative p-5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteDeck(deck._id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="font-semibold text-white mb-1 truncate">
                  {deck.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {deck.cardCount} cards
                  </span>
                  {deck.lastStudiedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(deck.lastStudiedAt)}
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 rounded-xl bg-linear-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <GenerateFlashcardsDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
      />
    </div>
  );
}
