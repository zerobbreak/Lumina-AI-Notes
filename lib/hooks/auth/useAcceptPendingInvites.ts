"use client";

import { useCallback } from "react";
import { authApi } from "@/lib/api/domains/auth.api";
import { useApiToken } from "@/lib/api/use-api-token";

export function useAcceptPendingInvites() {
  const { getApiToken } = useApiToken();

  return useCallback(async () => {
    const token = await getApiToken();
    await authApi.acceptPendingInvites(token);
  }, [getApiToken]);
}
