import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { AnnouncementEventDto, AnnouncementEventKind } from "@/types/api/announcements";

export const announcementsApi = {
  listEvents(token: string) {
    return apiFetch<AnnouncementEventDto[]>(apiPath`/announcements/events`, { token });
  },

  recordEvent(token: string, input: { announcementId: string; kind: AnnouncementEventKind }) {
    return apiFetch<AnnouncementEventDto>(apiPath`/announcements/events`, {
      method: "POST",
      token,
      body: input,
    });
  },

  resetEvents(token: string) {
    return apiFetch<{ deleted: number }>(apiPath`/announcements/events`, {
      method: "DELETE",
      token,
    });
  },
};
