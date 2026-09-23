export const collaborationKeys = {
  all: ["collaboration"] as const,
  people: (noteId: string) => [...collaborationKeys.all, "people", noteId] as const,
};
