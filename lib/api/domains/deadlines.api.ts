import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { DeadlineDto } from "@/types/api/deadlines";


export const deadlinesApi = {
  getUpcoming(
    token: string,
    params?: { limit?: number; windowDays?: number; includeCompleted?: boolean },
  ) {
    return apiFetch<DeadlineDto[]>(apiPath`/deadlines/upcoming`, { query: params ?? {}, token });
  },

  create(
    token: string,
    body: {
      title: string;
      dueAt: number;
      kind: "assignment" | "exam" | "event" | "task";
      courseId?: string;
      moduleId?: string;
      notes?: string;
    },
  ) {
    return apiFetch<DeadlineDto>(apiPath`/deadlines`, { method: "POST", token, body });
  },
};
