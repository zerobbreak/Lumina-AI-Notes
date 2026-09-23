import { withConvexIds } from "@/lib/api/adapters/convex-id";
import { toTimestamp } from "@/lib/api/adapters/timestamp";
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

function normalizeFlashcardDeck(deck: FlashcardDeckDto): FlashcardDeckDto {
  return {
    ...deck,
    createdAt: toTimestamp(deck.createdAt) ?? 0,
    lastStudiedAt: deck.lastStudiedAt != null ? toTimestamp(deck.lastStudiedAt) ?? null : null,
    examDate: deck.examDate != null ? toTimestamp(deck.examDate) ?? null : null,
  };
}

function normalizeQuizDeck(deck: QuizDeckDto): QuizDeckDto {
  return {
    ...deck,
    createdAt: toTimestamp(deck.createdAt) ?? 0,
    lastTakenAt: deck.lastTakenAt != null ? toTimestamp(deck.lastTakenAt) ?? null : null,
  };
}

export function toFlashcardDeck(deck: FlashcardDeckDto): FlashcardDeck {
  const normalized = normalizeFlashcardDeck(deck);
  const [mapped] = toFlashcardDecks([normalized]);
  return mapped!;
}

export function toFlashcardDecks(decks: FlashcardDeckDto[]): FlashcardDeck[] {
  return withConvexIds(decks.map(normalizeFlashcardDeck)).map((deck) => ({
    _id: deck._id,
    userId: deck.userId,
    title: deck.title,
    sourceNoteId: deck.sourceNoteId ?? undefined,
    courseId: deck.courseId ?? undefined,
    cardCount: deck.cardCount,
    createdAt: toTimestamp(deck.createdAt) ?? 0,
    lastStudiedAt:
      deck.lastStudiedAt != null ? toTimestamp(deck.lastStudiedAt) : undefined,
    examDate: deck.examDate != null ? toTimestamp(deck.examDate) : undefined,
  }));
}

export function toQuizDeck(deck: QuizDeckDto): QuizDeck {
  const normalized = normalizeQuizDeck(deck);
  const [mapped] = toQuizDecks([normalized]);
  return mapped!;
}

export function toQuizDecks(decks: QuizDeckDto[]): QuizDeck[] {
  return withConvexIds(decks.map(normalizeQuizDeck)).map((deck) => ({
    _id: deck._id,
    userId: deck.userId,
    title: deck.title,
    sourceNoteId: deck.sourceNoteId ?? undefined,
    courseId: deck.courseId ?? undefined,
    questionCount: deck.questionCount,
    createdAt: toTimestamp(deck.createdAt) ?? 0,
    lastTakenAt:
      deck.lastTakenAt != null ? toTimestamp(deck.lastTakenAt) : undefined,
  }));
}
