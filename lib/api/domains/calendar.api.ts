import { apiFetch } from "@/lib/api/client";
import type { CalendarActivityDto } from "@/types/api/calendar";

export const calendarApi = {
  getActivity(token: string, params: { startMs: number; endMs: number }) {
    const search = new URLSearchParams({
      startMs: String(params.startMs),
      endMs: String(params.endMs),
    });
    return apiFetch<CalendarActivityDto>(`/calendar/activity?${search}`, { token });
  },
};
