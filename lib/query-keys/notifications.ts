export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: { limit?: number; unreadOnly?: boolean }) =>
    [...notificationKeys.all, "list", params ?? {}] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};
