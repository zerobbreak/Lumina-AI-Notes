export const noteKeys = {
  all: ["notes"] as const,
  recent: (limit = 5) => [...noteKeys.all, "recent", { limit }] as const,
  pinned: (limit = 20) => [...noteKeys.all, "pinned", { limit }] as const,
  quick: (limit = 10) => [...noteKeys.all, "quick", { limit }] as const,
  archived: () => [...noteKeys.all, "archived"] as const,
  byContext: (params: { courseId?: string; moduleId?: string; tagId?: string }) =>
    [...noteKeys.all, "context", params] as const,
  detail: (noteId: string) => [...noteKeys.all, "detail", noteId] as const,
  children: (parentNoteId: string) => [...noteKeys.all, "children", parentNoteId] as const,
  resumeTarget: () => [...noteKeys.all, "resume-target"] as const,
};