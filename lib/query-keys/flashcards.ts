export const flashcardKeys = {
  all: ["flashcards"] as const,
  todayQueue: () => [...flashcardKeys.all, "today-queue"] as const,
  decks: () => [...flashcardKeys.all, "decks"] as const,
  deck: (deckId: string) => [...flashcardKeys.all, "deck", deckId] as const,
  cards: (deckId: string) => [...flashcardKeys.all, "cards", deckId] as const,
};
