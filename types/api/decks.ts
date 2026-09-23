export type FlashcardDeckDto = {
  id: string;
  userId: string;
  title: string;
  sourceNoteId?: string | null;
  courseId?: string | null;
  cardCount: number;
  createdAt: string | number;
  lastStudiedAt?: string | number | null;
  examDate?: string | number | null;
};

export type QuizDeckDto = {
  id: string;
  userId: string;
  title: string;
  sourceNoteId?: string | null;
  courseId?: string | null;
  questionCount: number;
  createdAt: string | number;
  lastTakenAt?: string | number | null;
};
