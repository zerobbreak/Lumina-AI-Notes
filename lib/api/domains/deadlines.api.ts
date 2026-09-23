import { apiFetch } from "@/lib/api/client";
import type { DeadlineDto } from "@/types/api/deadlines";

function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const deadlinesApi = {
  getUpcoming(
    token: string,
    params?: { limit?: number; windowDays?: number; includeCompleted?: boolean },
  ) {
    return apiFetch<DeadlineDto[]>(`/deadlines/upcoming${qs(params ?? {})}`, { token });
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
    return apiFetch<DeadlineDto>("/deadlines", { method: "POST", token, body });
  },
};
