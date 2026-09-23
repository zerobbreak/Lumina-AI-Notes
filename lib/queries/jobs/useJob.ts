"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { jobsApi } from "@/lib/api/domains/jobs.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateRecordings } from "@/lib/invalidation";
import { pollWhileActive, POLL_MS } from "@/lib/queries/polling";
import { jobKeys } from "@/lib/query-keys/jobs";
import { noteKeys } from "@/lib/query-keys/notes";
import { isJobActive, type JobDto } from "@/types/api/jobs";

/**
 * A background job's progress, polled every 2s while it's queued or running
 * and not at all once it's finished. When it finishes, the note it wrote
 * into (and the sessions list) are refetched so the result shows up.
 */
export function useJob(jobId: string | null | undefined) {
  const { getApiToken, isReady } = useApiToken();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: jobId ? jobKeys.detail(jobId) : jobKeys.all,
    queryFn: async () => {
      if (!jobId) throw new Error("Missing jobId");
      return jobsApi.getById(await getApiToken(), jobId);
    },
    enabled: isReady && Boolean(jobId),
    staleTime: 0,
    ...pollWhileActive<JobDto>(POLL_MS.job, (job) => !job || isJobActive(job.status)),
  });

  const status = query.data?.status;
  const noteId = query.data?.noteId;
  const previous = useRef(status);
  useEffect(() => {
    const was = previous.current;
    previous.current = status;
    if (!status || isJobActive(status) || !isJobActive(was)) return;
    if (noteId) void queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
    void queryClient.invalidateQueries({ queryKey: noteKeys.all });
    invalidateRecordings(queryClient);
  }, [status, noteId, queryClient]);

  return query;
}
