import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { CourseOverviewDto } from "@/types/api/courseOverview";
import type { HomeSummaryDto } from "@/types/api/home";

export const homeApi = {
  getSummary(token: string, tzOffsetMinutes: number) {
    return apiFetch<HomeSummaryDto>(apiPath`/home`, { query: { tzOffsetMinutes }, token });
  },
  getCourseOverview(token: string, courseId: string, tzOffsetMinutes: number) {
    return apiFetch<CourseOverviewDto>(apiPath`/courses/${courseId}/overview`, { query: { tzOffsetMinutes }, token });
  },
};
