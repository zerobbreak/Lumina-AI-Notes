"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { jobsApi } from "@/lib/api/domains/jobs.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { jobKeys } from "@/lib/query-keys/jobs";
import { noteKeys } from "@/lib/query-keys/notes";

export function useJobActions() {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  const retryJob = useCallback(
    async (jobId: string) => {
      const job = await jobsApi.retry(await getApiToken(), jobId);
      // Seeds the poll with the queued state, so it starts polling again at once.
      queryClient.setQueryData(jobKeys.detail(jobId), job);
      return job;
    },
    [getApiToken, queryClient],
  );

  const dismissJob = useCallback(
    async (jobId: string, noteId: string) => {
      await jobsApi.dismiss(await getApiToken(), jobId);
      await queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
    },
    [getApiToken, queryClient],
  );

  return { retryJob, dismissJob };
}
