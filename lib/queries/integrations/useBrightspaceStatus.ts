"use client";

import { useQuery } from "@tanstack/react-query";
import { brightspaceApi } from "@/lib/api/domains/integrations.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { integrationKeys } from "@/lib/query-keys/integrations";

export function useBrightspaceStatus(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: integrationKeys.brightspace(),
    queryFn: async () => {
      const token = await getApiToken();
      return brightspaceApi.getStatus(token);
    },
    enabled: isReady && enabled,
    // A server without the encryption key answers 503; retrying won't change that.
    retry: false,
  });
}
