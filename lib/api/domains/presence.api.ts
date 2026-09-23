import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { PresenceCountDto, PresenceViewerDto } from "@/types/api/presence";

export const presenceApi = {
  heartbeat(token: string, noteId: string) {
    return apiFetch<{ success: boolean }>(apiPath`/notes/${noteId}/presence/heartbeat`, {
      method: "POST",
      token,
    });
  },

  leave(token: string, noteId: string) {
    return apiFetch<{ success: boolean }>(apiPath`/notes/${noteId}/presence`, {
      method: "DELETE",
      token,
    });
  },

  getViewers(token: string, noteId: string) {
    return apiFetch<PresenceViewerDto[]>(apiPath`/notes/${noteId}/presence/viewers`, { token });
  },

  getViewerCount(token: string, noteId: string) {
    return apiFetch<PresenceCountDto>(apiPath`/notes/${noteId}/presence/count`, { token });
  },
};
