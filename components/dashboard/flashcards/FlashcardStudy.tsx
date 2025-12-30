"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FlashcardCard } from "./FlashcardCard";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Check,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardStudyProps {
  deckId: string;
}

export function FlashcardStudy({ deckId }: FlashcardStudyProps) {
  const router = useRouter();
  const deck = useQuery(api.flashcards.getDeck, {
    deckId: deckId as Id<"flashcardDecks">,
  });
  const flashcards = useQuery(api.flashcards.getFlashcards, {
    deckId: deckId as Id<"flashcardDecks">,
  });
  const markStudied = useMutation(api.flashcards.markDeckStudied);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<number>>(new Set());

  const totalCards = flashcards?.length ?? 0;
  const currentCard = flashcards?.[currentIndex];

  // Mark deck as studied when component mounts
  useEffect(() => {
    if (deck) {
      markStudied({ deckId: deckId as Id<"flashcardDecks"> });
    }
  }, [deck, deckId, markStudied]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        setIsFlipped(false);
      } else if (e.key === "ArrowRight" && currentIndex < totalCards - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, totalCards]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleKnow = () => {
    setKnownCards((prev) => new Set(prev).add(currentIndex));
    setUnknownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    if (currentIndex < totalCards - 1) {
      handleNext();
    }
  };

  const handleDontKnow = () => {
    setUnknownCards((prev) => new Set(prev).add(currentIndex));
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    if (currentIndex < totalCards - 1) {
      handleNext();
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  const handleBack = () => {
    router.push("/dashboard?view=flashcards");
  };

  if (!deck || !flashcards) {
    return (
      <div className="h-full flex items-center justify-center bg-black/40">
        <div className="flex items-center gap-2 text-gray-500 animate-pulse">
          <Layers className="w-5 h-5" />
          <span>Loading flashcards...</span>
        </div>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black/40 gap-4">
        <p className="text-gray-400">This deck has no flashcards.</p>
        <Button variant="outline" onClick={handleBack}>
          Back to Flashcards
        </Button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / totalCards) * 100;
  const knownCount = knownCards.size;
  const unknownCount = unknownCards.size;

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-[#050505] to-[#0a0a12] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-gray-400 hover:text-white gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-white truncate max-w-md">
          {deck.title}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-gray-400 hover:text-white gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>
            Card {currentIndex + 1} of {totalCards}
          </span>
          <div className="flex gap-4">
            <span className="text-green-400">✓ {knownCount}</span>
            <span className="text-red-400">✗ {unknownCount}</span>
          </div>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center p-8">
        {currentCard && (
          <FlashcardCard
            front={currentCard.front}
            back={currentCard.back}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-white/5">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleDontKnow}
            className={cn(
              "gap-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400",
              unknownCards.has(currentIndex) && "ring-2 ring-red-500/50"
            )}
          >
            <X className="w-5 h-5" />
            Don&apos;t Know
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleKnow}
            className={cn(
              "gap-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400",
              knownCards.has(currentIndex) && "ring-2 ring-green-500/50"
            )}
          >
            <Check className="w-5 h-5" />
            Know It
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-sm text-gray-500 min-w-[100px] text-center">
            Use ← → arrows or space to flip
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === totalCards - 1}
            className="text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
