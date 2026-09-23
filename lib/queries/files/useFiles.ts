"use client";

import { useQuery } from "@tanstack/react-query";
import { toUserFiles } from "@/lib/api/adapters/file";
import { filesApi } from "@/lib/api/domains/files.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { fileKeys } from "@/lib/query-keys/files";

export function useFiles(params?: { courseId?: string; limit?: number }, enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: fileKeys.list(params),
    queryFn: async () => {
      const token = await getApiToken();
      return toUserFiles(await filesApi.list(token, params));
    },
    enabled: isRestApiEnabled() && isReady && enabled,
  });
}
