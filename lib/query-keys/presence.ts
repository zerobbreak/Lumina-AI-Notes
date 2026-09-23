export const presenceKeys = {
  all: ["presence"] as const,
  viewers: (noteId: string) => [...presenceKeys.all, "viewers", noteId] as const,
  count: (noteId: string) => [...presenceKeys.all, "count", noteId] as const,
};
