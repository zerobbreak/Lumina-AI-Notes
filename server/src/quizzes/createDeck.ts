import type { Db } from "../db/client.js";
import { quizDecks, quizQuestions } from "../db/schema/index.js";

export async function createDeckWithQuestions(
  db: Db,
  userId: string,
  args: {
    title: string;
    sourceNoteId?: string;
    courseId?: string;
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }>;
  },
) {
  const [deck] = await db
    .insert(quizDecks)
    .values({
      userId,
      title: args.title,
      sourceNoteId: args.sourceNoteId,
      courseId: args.courseId,
      questionCount: args.questions.length,
    })
    .returning();

  if (args.questions.length > 0) {
    await db.insert(quizQuestions).values(
      args.questions.map((q, position) => ({
        deckId: deck.id,
        position,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    );
  }
  return deck.id;
}
