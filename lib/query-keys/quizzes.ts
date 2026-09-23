export const quizKeys = {
  all: ["quizzes"] as const,
  decks: () => [...quizKeys.all, "decks"] as const,
};
