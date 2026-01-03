"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
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
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardStudyProps {
  deckId: string;
}

export function FlashcardStudy({ deckId }: FlashcardStudyProps) {
  const router = useRouter();
  const typedDeckId = deckId as Id<"flashcardDecks">;
  
  const deck = useQuery(api.flashcards.getDeck, { deckId: typedDeckId });
  const flashcards = useQuery(api.flashcards.getFlashcards, { deckId: typedDeckId });
  const markStudied = useMutation(api.flashcards.markDeckStudied);
  const updateCardReview = useMutation(api.flashcards.updateCardReview);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<number>>(new Set());
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

  // Memoized keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, [currentIndex, totalCards]);

  // Keyboard navigation
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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

  // Spaced repetition: update card review with difficulty rating
  const handleKnow = useCallback(() => {
    const cardIndex = shuffledIndices ? shuffledIndices[currentIndex] : currentIndex;
    const card = flashcards?.[cardIndex];
    
    setKnownCards((prev) => new Set(prev).add(currentIndex));
    setUnknownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    
    // Update spaced repetition - easy = longer interval
    if (card) {
      const currentDifficulty = card.difficulty ?? 2.5;
      const newDifficulty = Math.min(currentDifficulty + 0.1, 3.0);
      const reviewCount = (card.reviewCount ?? 0) + 1;
      // Next review in days: base * difficulty^reviewCount (capped at 30 days)
      const daysUntilReview = Math.min(Math.pow(newDifficulty, reviewCount), 30);
      const nextReviewAt = Date.now() + daysUntilReview * 24 * 60 * 60 * 1000;
      
      updateCardReview({
        cardId: card._id,
        difficulty: newDifficulty,
        nextReviewAt,
        reviewCount,
      });
    }
    
    if (currentIndex < totalCards - 1) {
      handleNext();
    }
  }, [currentIndex, totalCards, flashcards, shuffledIndices, handleNext, updateCardReview]);

  const handleDontKnow = useCallback(() => {
    const cardIndex = shuffledIndices ? shuffledIndices[currentIndex] : currentIndex;
    const card = flashcards?.[cardIndex];
    
    setUnknownCards((prev) => new Set(prev).add(currentIndex));
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    
    // Update spaced repetition - hard = shorter interval, lower difficulty
    if (card) {
      const currentDifficulty = card.difficulty ?? 2.5;
      const newDifficulty = Math.max(currentDifficulty - 0.2, 1.3);
      const reviewCount = card.reviewCount ?? 0; // Don't increment for wrong answers
      // Review again soon (1 day minimum)
      const nextReviewAt = Date.now() + 1 * 24 * 60 * 60 * 1000;
      
      updateCardReview({
        cardId: card._id,
        difficulty: newDifficulty,
        nextReviewAt,
        reviewCount,
      });
    }
    
    if (currentIndex < totalCards - 1) {
      handleNext();
    }
  }, [currentIndex, totalCards, flashcards, shuffledIndices, handleNext, updateCardReview]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            className="text-gray-400 hover:text-white gap-2"
            title="Shuffle cards"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
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
