"use client";

import { useQuery } from "@tanstack/react-query";
import { toCalendarActivity } from "@/lib/api/adapters/calendar";
import { calendarApi } from "@/lib/api/domains/calendar.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { calendarKeys } from "@/lib/query-keys/calendar";

export function useCalendarActivity(range: { startMs: number; endMs: number }) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: calendarKeys.activity(range),
    queryFn: async () => {
      const token = await getApiToken();
      return toCalendarActivity(await calendarApi.getActivity(token, range));
    },
    enabled: isRestApiEnabled() && isReady,
  });
}
