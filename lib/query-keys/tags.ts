export const tagKeys = {
  all: ["tags"] as const,
  withCounts: () => [...tagKeys.all, "with-counts"] as const,
};
