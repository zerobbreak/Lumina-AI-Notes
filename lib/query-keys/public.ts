export const publicKeys = {
  all: ["public"] as const,
  note: (noteId: string) => [...publicKeys.all, "note", noteId] as const,
};
