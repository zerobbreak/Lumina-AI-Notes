import { withConvexIds } from "@/lib/api/adapters/convex-id";
import type { FlashcardDeckDto, QuizDeckDto } from "@/types/api/decks";
import type { FlashcardDeck } from "@/types";

export type QuizDeck = {
  _id: string;
  userId: string;
  title: string;
  sourceNoteId?: string;
  courseId?: string;
  questionCount: number;
  createdAt: number;
  lastTakenAt?: number;
};

export function toFlashcardDecks(decks: FlashcardDeckDto[]): FlashcardDeck[] {
  return withConvexIds(decks).map((deck) => ({
    ...deck,
    sourceNoteId: deck.sourceNoteId ?? undefined,
    courseId: deck.courseId ?? undefined,
    lastStudiedAt: deck.lastStudiedAt ?? undefined,
    examDate: deck.examDate ?? undefined,
  }));
}

export function toQuizDecks(decks: QuizDeckDto[]): QuizDeck[] {
  return withConvexIds(decks).map((deck) => ({
    ...deck,
    sourceNoteId: deck.sourceNoteId ?? undefined,
    courseId: deck.courseId ?? undefined,
    lastTakenAt: deck.lastTakenAt ?? undefined,
  }));
}
