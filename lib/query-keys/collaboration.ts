export const collaborationKeys = {
  all: ["collaboration"] as const,
  people: (noteId: string) => [...collaborationKeys.all, "people", noteId] as const,
  access: (noteId: string) => [...collaborationKeys.all, "access", noteId] as const,
};
