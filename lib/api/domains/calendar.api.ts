import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { CalendarActivityDto } from "@/types/api/calendar";

export const calendarApi = {
  getActivity(token: string, params: { startMs: number; endMs: number }) {
    return apiFetch<CalendarActivityDto>(apiPath`/calendar/activity`, {
      token,
      query: {
        startMs: params.startMs,
        endMs: params.endMs,
        // Study counts are grouped by the user's local day.
        tzOffsetMinutes: new Date(params.startMs).getTimezoneOffset(),
      },
    });
  },
};
