export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
  gamification: () => [...userKeys.all, "gamification"] as const,
  usage: () => [...userKeys.all, "usage"] as const,
};
