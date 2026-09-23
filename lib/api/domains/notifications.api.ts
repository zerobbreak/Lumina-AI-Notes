import { apiFetch } from "@/lib/api/client";
import type { NotificationDto, UnreadCountDto } from "@/types/api/notifications";

export const notificationsApi = {
  list(token: string, params?: { limit?: number; unreadOnly?: boolean }) {
    const search = new URLSearchParams();
    if (params?.limit !== undefined) search.set("limit", String(params.limit));
    if (params?.unreadOnly) search.set("unreadOnly", "true");
    const query = search.toString();
    return apiFetch<NotificationDto[]>(`/notifications${query ? `?${query}` : ""}`, {
      token,
    });
  },

  unreadCount(token: string) {
    return apiFetch<UnreadCountDto>("/notifications/unread-count", { token });
  },

  markRead(token: string, id: string) {
    return apiFetch<NotificationDto>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      token,
    });
  },

  markAllRead(token: string) {
    return apiFetch<{ updated: number }>("/notifications/mark-all-read", {
      method: "POST",
      token,
    });
  },
};
