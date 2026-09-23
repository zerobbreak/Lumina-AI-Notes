import { withConvexIds } from "@/lib/api/adapters/convex-id";
import { toTimestamp } from "@/lib/api/adapters/timestamp";
import type { FlashcardDto } from "@/types/api/flashcards";
import type { Flashcard } from "@/types";

export function toFlashcards(cards: FlashcardDto[]): Flashcard[] {
  return withConvexIds(cards).map((card) => ({
    _id: card._id,
    userId: card.userId ?? "",
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    difficulty: card.difficulty ?? undefined,
    nextReviewAt: toTimestamp(card.nextReviewAt),
    reviewCount: card.reviewCount ?? undefined,
    lastReviewedAt: toTimestamp(card.lastReviewedAt),
    easeFactor: card.easeFactor ?? undefined,
    interval: card.interval ?? undefined,
    repetitions: card.repetitions ?? undefined,
    lastRating:
      card.lastRating === "easy" || card.lastRating === "medium" || card.lastRating === "hard"
        ? card.lastRating
        : undefined,
  }));
}
