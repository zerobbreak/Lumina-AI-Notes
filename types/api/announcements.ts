export type AnnouncementEventKind = "seen" | "dismissed" | "clicked";

/** One row from `GET /announcements/events`. */
export type AnnouncementEventDto = {
  announcementId: string;
  kind: AnnouncementEventKind;
  at: number;
};
