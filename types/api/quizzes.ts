export type QuizQuestionDto = {
  id: string;
  deckId: string;
  position?: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string | null;
};

/** One row from `GET /quizzes/decks/:deckId/results/latest` (null when never taken). */
export type QuizResultDto = {
  id: string;
  deckId: string;
  score: number;
  totalQuestions: number;
  completedAt: string | number;
};
