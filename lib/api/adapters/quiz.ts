import { withConvexIds } from "@/lib/api/adapters/convex-id";
import type { QuizQuestionDto } from "@/types/api/quizzes";

export type QuizQuestion = {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

export function toQuizQuestions(questions: QuizQuestionDto[]): QuizQuestion[] {
  return withConvexIds(questions).map((q) => ({
    _id: q._id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? undefined,
  }));
}
