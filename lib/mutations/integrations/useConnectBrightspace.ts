"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { brightspaceApi } from "@/lib/api/domains/integrations.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { applyBrightspaceStatus } from "@/lib/invalidation";

export function useConnectBrightspace() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (url: string) => {
      const token = await getApiToken();
      return brightspaceApi.connectFeed(token, url);
    },
    onSuccess: (response) => {
      applyBrightspaceStatus(queryClient, response);
    },
  });
}
