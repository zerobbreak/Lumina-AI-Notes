"use client";

import { useMutation } from "@tanstack/react-query";
import { feedbackApi } from "@/lib/api/domains/feedback.api";
import { useApiToken } from "@/lib/api/use-api-token";
import type { SendFeedbackInput } from "@/types/api/feedback";

export function useSendFeedback() {
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: SendFeedbackInput) => {
      const token = await getApiToken();
      return feedbackApi.send(token, input);
    },
  });
}
