export const jobKeys = {
  all: ["jobs"] as const,
  detail: (id: string) => [...jobKeys.all, "detail", id] as const,
};
