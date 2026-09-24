"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { brightspaceApi } from "@/lib/api/domains/integrations.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { applyBrightspaceStatus } from "@/lib/invalidation";

export function useDisconnectBrightspace() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getApiToken();
      return brightspaceApi.disconnect(token);
    },
    onSuccess: () => {
      applyBrightspaceStatus(queryClient, { connected: false });
    },
  });
}
