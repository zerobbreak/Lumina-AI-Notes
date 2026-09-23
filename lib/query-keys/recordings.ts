export const recordingKeys = {
  all: ["recordings"] as const,
  list: () => [...recordingKeys.all, "list"] as const,
  detail: (id: string) => [...recordingKeys.all, "detail", id] as const,
};
