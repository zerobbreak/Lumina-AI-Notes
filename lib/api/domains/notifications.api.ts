import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { NotificationDto, UnreadCountDto } from "@/types/api/notifications";

export const notificationsApi = {
  list(token: string, params?: { limit?: number; unreadOnly?: boolean }) {
    return apiFetch<NotificationDto[]>(apiPath`/notifications`, {
      token,
      query: { limit: params?.limit, unreadOnly: params?.unreadOnly ? "true" : undefined },
    });
  },

  unreadCount(token: string) {
    return apiFetch<UnreadCountDto>(apiPath`/notifications/unread-count`, { token });
  },

  markRead(token: string, id: string) {
    return apiFetch<NotificationDto>(apiPath`/notifications/${id}/read`, {
      method: "PATCH",
      token,
    });
  },

  markAllRead(token: string) {
    return apiFetch<{ updated: number }>(apiPath`/notifications/mark-all-read`, {
      method: "POST",
      token,
    });
  },
};
