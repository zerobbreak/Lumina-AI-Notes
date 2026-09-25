"use client";

import { useQuery } from "@tanstack/react-query";
import { homeApi } from "@/lib/api/domains/home.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { homeKeys } from "@/lib/query-keys/home";

/** One course's plan, deadlines, decks and quizzes, and exam prep when an exam is close. */
export function useCourseOverview(courseId: string | undefined) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: homeKeys.courseOverview(courseId ?? ""),
    queryFn: async () => {
      const token = await getApiToken();
      return homeApi.getCourseOverview(token, courseId!, new Date().getTimezoneOffset());
    },
    enabled: isReady && Boolean(courseId),
  });
}
