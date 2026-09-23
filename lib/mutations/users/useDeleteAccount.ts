"use client";

import { useMutation } from "@tanstack/react-query";
import { accountApi } from "@/lib/api/domains/account.api";
import { useApiToken } from "@/lib/api/use-api-token";

/** Deletes the account for good. The caller signs out afterwards. */
export function useDeleteAccount() {
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getApiToken();
      await accountApi.deleteAccount(token);
    },
  });
}
