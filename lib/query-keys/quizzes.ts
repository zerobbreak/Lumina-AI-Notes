export const quizKeys = {
  all: ["quizzes"] as const,
  decks: () => [...quizKeys.all, "decks"] as const,
  deck: (deckId: string) => [...quizKeys.all, "deck", deckId] as const,
  questions: (deckId: string) => [...quizKeys.all, "questions", deckId] as const,
  latestResult: (deckId: string) => [...quizKeys.all, "latest-result", deckId] as const,
};
