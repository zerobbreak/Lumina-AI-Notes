export const announcementKeys = {
  all: ["announcements"] as const,
  events: () => [...announcementKeys.all, "events"] as const,
};
