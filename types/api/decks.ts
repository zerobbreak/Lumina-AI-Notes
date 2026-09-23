export type FlashcardDeckDto = {
  id: string;
  userId: string;
  title: string;
  sourceNoteId?: string | null;
  courseId?: string | null;
  cardCount: number;
  createdAt: number;
  lastStudiedAt?: number | null;
  examDate?: number | null;
};

export type QuizDeckDto = {
  id: string;
  userId: string;
  title: string;
  sourceNoteId?: string | null;
  courseId?: string | null;
  questionCount: number;
  createdAt: number;
  lastTakenAt?: number | null;
};
