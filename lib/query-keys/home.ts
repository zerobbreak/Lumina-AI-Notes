export const homeKeys = {
  all: ["home"] as const,
  summary: () => [...homeKeys.all, "summary"] as const,
  // Under "home" so everything that refreshes home refreshes the course page too.
  courseOverview: (courseId: string) => [...homeKeys.all, "course", courseId] as const,
};
