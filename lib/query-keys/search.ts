export const searchKeys = {
  all: ["search"] as const,
  query: (params: {
    query: string;
    type?: string;
    courseId?: string;
    tagIds?: string[];
  }) => [...searchKeys.all, params] as const,
};
