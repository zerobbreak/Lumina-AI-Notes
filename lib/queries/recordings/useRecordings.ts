"use client";

import { useQuery } from "@tanstack/react-query";
import { toRecordings } from "@/lib/api/adapters/recording";
import { recordingsApi } from "@/lib/api/domains/recordings.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { recordingKeys } from "@/lib/query-keys/recordings";

export function useRecordings(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: recordingKeys.list(),
    queryFn: async () => {
      const token = await getApiToken();
      return toRecordings(await recordingsApi.list(token));
    },
    enabled: isReady && enabled,
  });
}
