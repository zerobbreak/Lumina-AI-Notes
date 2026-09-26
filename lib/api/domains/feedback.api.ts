import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { SendFeedbackInput } from "@/types/api/feedback";

export const feedbackApi = {
  send(token: string, input: SendFeedbackInput) {
    return apiFetch<{ id: string }>(apiPath`/feedback`, { method: "POST", token, body: input });
  },
};
