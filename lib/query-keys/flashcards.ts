export const flashcardKeys = {
  all: ["flashcards"] as const,
  todayQueue: () => [...flashcardKeys.all, "today-queue"] as const,
  decks: () => [...flashcardKeys.all, "decks"] as const,
};
