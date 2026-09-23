export type QuizQuestionDto = {
  id: string;
  deckId: string;
  position?: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string | null;
};
