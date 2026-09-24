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

  /** Every deadline due in a range, finished ones included. */
  getRange(token: string, params: { startMs: number; endMs: number }) {
    return apiFetch<DeadlineDto[]>(apiPath`/deadlines/range`, { query: params, token });
  },

  getOverdue(token: string, params?: { limit?: number; windowDays?: number }) {
    return apiFetch<DeadlineDto[]>(apiPath`/deadlines/overdue`, { query: params ?? {}, token });
  },

  setCompleted(token: string, id: string, completed: boolean) {
    return apiFetch<DeadlineDto>(apiPath`/deadlines/${id}`, {
      method: "PATCH",
      token,
      body: { completed },
    });
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
