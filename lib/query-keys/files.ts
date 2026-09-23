export const fileKeys = {
  all: ["files"] as const,
  list: (params?: { courseId?: string; limit?: number }) =>
    [...fileKeys.all, "list", params ?? {}] as const,
};
