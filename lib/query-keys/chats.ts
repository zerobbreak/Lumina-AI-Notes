export const chatKeys = {
  all: ["chats"] as const,
  sessions: () => [...chatKeys.all, "sessions"] as const,
  session: (id: string) => [...chatKeys.all, "session", id] as const,
  messages: (sessionId: string) => [...chatKeys.all, "messages", sessionId] as const,
  contextNotes: (noteIds: string[]) =>
    [...chatKeys.all, "context-notes", [...noteIds].sort().join(",")] as const,
};
