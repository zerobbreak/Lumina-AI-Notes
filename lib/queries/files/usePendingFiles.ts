"use client";

import { useQuery } from "@tanstack/react-query";
import { toUserFiles } from "@/lib/api/adapters/file";
import { filesApi } from "@/lib/api/domains/files.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { pollWhileActive, POLL_MS } from "@/lib/queries/polling";
import { fileKeys } from "@/lib/query-keys/files";
import type { UserFile } from "@/types";

export function usePendingFiles(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: fileKeys.pending(),
    queryFn: async () => {
      const token = await getApiToken();
      return toUserFiles(await filesApi.listPending(token));
    },
    enabled: isReady && enabled,
    ...pollWhileActive<UserFile[]>(
      POLL_MS.fileProcessing,
      (files) => (files?.length ?? 0) > 0,
      POLL_MS.fileIdle,
    ),
  });
}
