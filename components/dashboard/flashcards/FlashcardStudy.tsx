"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/types/data-model";
import { useFlashcardStudyActions } from "@/lib/hooks/flashcards/useFlashcardStudyActions";
import { useFlashcardStudyData } from "@/lib/hooks/flashcards/useFlashcardStudyData";
import { FlashcardCard } from "./FlashcardCard";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Check,
  Layers,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardStudyProps {
  deckId: string;
}

export function FlashcardStudy({ deckId }: FlashcardStudyProps) {
  const router = useRouter();
  const typedDeckId = deckId as Id<"flashcardDecks">;
  
  const { deck, flashcards } = useFlashcardStudyData(deckId);
  const { markStudied, scheduleNextReview } = useFlashcardStudyActions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [easyCards, setEasyCards] = useState<Set<number>>(new Set());
  const [mediumCards, setMediumCards] = useState<Set<number>>(new Set());
  const [hardCards, setHardCards] = useState<Set<number>>(new Set());
  const [shuffledIndices, setShuffledIndices] = useState<number[] | null>(null);

  const totalCards = flashcards?.length ?? 0;
  
  // Get current card based on shuffle state
  const currentCardIndex = shuffledIndices ? shuffledIndices[currentIndex] : currentIndex;
  const currentCard = flashcards?.[currentCardIndex];

  // Mark deck as studied when component mounts (only once)
  const hasMarkedStudied = useRef(false);
  useEffect(() => {
    if (deck && !hasMarkedStudied.current) {
      hasMarkedStudied.current = true;
      markStudied({ deckId: typedDeckId });
    }
  }, [deck, markStudied, typedDeckId]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, totalCards]);

  // Spaced repetition: update card review with rating
  const handleRate = useCallback((rating: "easy" | "medium" | "hard") => {
    const cardIndex = shuffledIndices ? shuffledIndices[currentIndex] : currentIndex;
    const card = flashcards?.[cardIndex];
    
    setEasyCards((prev) => {
      const next = new Set(prev);
      if (rating === "easy") next.add(currentIndex);
      else next.delete(currentIndex);
      return next;
    });
    setMediumCards((prev) => {
      const next = new Set(prev);
      if (rating === "medium") next.add(currentIndex);
      else next.delete(currentIndex);
      return next;
    });
    setHardCards((prev) => {
      const next = new Set(prev);
      if (rating === "hard") next.add(currentIndex);
      else next.delete(currentIndex);
      return next;
    });

    if (card) {
      scheduleNextReview({
        cardId: card._id as Id<"flashcards">,
        rating,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });
    }
    
    if (currentIndex < totalCards - 1) {
      handleNext();
    }
  }, [currentIndex, totalCards, flashcards, shuffledIndices, handleNext, scheduleNextReview]);

  // Memoized keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setIsFlipped((prev) => !prev);
    } else if (e.key === "1") {
      e.preventDefault();
      handleRate("hard");
    } else if (e.key === "2") {
      e.preventDefault();
      handleRate("medium");
    } else if (e.key === "3") {
      e.preventDefault();
      handleRate("easy");
    } else if (e.key === "ArrowLeft" && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    } else if (e.key === "ArrowRight" && currentIndex < totalCards - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, totalCards, handleRate]);

  // Keyboard navigation
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setEasyCards(new Set());
    setMediumCards(new Set());
    setHardCards(new Set());
    setShuffledIndices(null);
  }, []);

  const handleShuffle = useCallback(() => {
    if (!flashcards) return;
    const indices = Array.from({ length: flashcards.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards]);

  const handleBack = useCallback(() => {
    router.push("/dashboard?view=flashcards");
  }, [router]);

  if (!deck || !flashcards) {
    return (
      <div className="h-full flex items-center justify-center bg-inset">
        <div className="flex items-center gap-2 text-muted-foreground/80 animate-pulse">
          <Layers className="w-5 h-5" />
          <span>Loading flashcards...</span>
        </div>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-inset gap-4">
        <p className="text-muted-foreground">This deck has no flashcards.</p>
        <Button variant="outline" onClick={handleBack}>
          Back to Flashcards
        </Button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / totalCards) * 100;
  const easyCount = easyCards.size;
  const mediumCount = mediumCards.size;
  const hardCount = hardCards.size;

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-background to-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-foreground truncate max-w-md">
          {deck.title}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            className="text-muted-foreground hover:text-foreground gap-2"
            title="Shuffle cards"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground/80 mb-1">
          <span>
            Card {currentIndex + 1} of {totalCards}
          </span>
          <div className="flex gap-4">
            <span className="text-green-400">Easy {easyCount}</span>
            <span className="text-blue-400">Medium {mediumCount}</span>
            <span className="text-red-400">Hard {hardCount}</span>
          </div>
        </div>
        <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary to-cyan-500 transition-all duration-300"
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
      <div className="p-6 border-t border-border/60">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleRate("hard")}
            className={cn(
              "gap-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400",
              hardCards.has(currentIndex) && "ring-2 ring-red-500/50"
            )}
          >
            <X className="w-5 h-5" />
            Hard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleRate("medium")}
            className={cn(
              "gap-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400",
              mediumCards.has(currentIndex) && "ring-2 ring-blue-500/50"
            )}
          >
            <Check className="w-5 h-5" />
            Medium
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleRate("easy")}
            className={cn(
              "gap-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400",
              easyCards.has(currentIndex) && "ring-2 ring-green-500/50"
            )}
          >
            <Check className="w-5 h-5" />
            Easy
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-sm text-muted-foreground/80 min-w-[100px] text-center">
            Use ← → or space to flip, 1/2/3 to rate
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === totalCards - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
