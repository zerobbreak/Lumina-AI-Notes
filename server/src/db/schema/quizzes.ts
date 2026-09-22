import { doublePrecision, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, searchVector, timestamptz } from "./columns.js";
import { notes } from "./notes.js";
import { users } from "./users.js";

export const quizDecks = pgTable(
  "quiz_decks",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    sourceNoteId: text().references(() => notes.id, { onDelete: "set null" }),
    courseId: text(),
    questionCount: integer().notNull().default(0),
    createdAt: createdAt(),
    lastTakenAt: timestamptz(),
    searchTitle: searchVector("title"),
  },
  (t) => [
    index().on(t.userId),
    index("quiz_decks_search_title_idx").using("gin", t.searchTitle),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: id(),
    deckId: text()
      .notNull()
      .references(() => quizDecks.id, { onDelete: "cascade" }),
    // Explicit order; see flashcards.position.
    position: integer().notNull().default(0),
    question: text().notNull(),
    /** Four options */
    options: text().array().notNull(),
    /** Index into options, 0-3 */
    correctAnswer: integer().notNull(),
    explanation: text(),
    difficulty: doublePrecision(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.deckId, t.position)],
);

export const quizResults = pgTable(
  "quiz_results",
  {
    id: id(),
    deckId: text()
      .notNull()
      .references(() => quizDecks.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer().notNull(),
    totalQuestions: integer().notNull(),
    /** Chosen option index per question */
    answers: integer().array().notNull(),
    completedAt: timestamptz().notNull().defaultNow(),
    /** Seconds */
    timeSpent: doublePrecision(),
  },
  (t) => [
    index().on(t.userId, t.deckId),
    index().on(t.userId, t.completedAt),
    index().on(t.deckId, t.completedAt),
  ],
);
