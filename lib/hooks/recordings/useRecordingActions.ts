"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { recordingsApi, type ProcessRecordingBody } from "@/lib/api/domains/recordings.api";
import { noteKeys } from "@/lib/query-keys/notes";
import { jobKeys } from "@/lib/query-keys/jobs";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateRecordings } from "@/lib/invalidation";

export function useRecordingActions() {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateRecordings(queryClient);
  }, [queryClient]);

  const upsertDraft = useCallback(
    async (args: {
      sessionId: string;
      title: string;
      transcript: string;
      duration?: number;
    }) => {
      const token = await getApiToken();
      await recordingsApi.upsertDraft(token, args);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const saveUploadedRecording = useCallback(
    async (args: {
      title: string;
      storageId: string;
      duration?: number;
      tzOffsetMinutes?: number;
      sessionId?: string;
    }) => {
      const token = await getApiToken();
      await recordingsApi.saveUploaded(token, {
        title: args.title,
        storageKey: args.storageId,
        duration: args.duration,
        tzOffsetMinutes: args.tzOffsetMinutes,
        sessionId: args.sessionId,
      });
      invalidate();
    },
    [getApiToken, invalidate],
  );

  /** Starts background note generation; returns the job and the note it writes into. */
  const processRecording = useCallback(
    async (body: ProcessRecordingBody) => {
      const token = await getApiToken();
      const result = await recordingsApi.process(token, body);
      queryClient.setQueryData(jobKeys.detail(result.job.id), result.job);
      invalidate();
      // The placeholder note (or the now-locked target) appears in lists and the editor.
      void queryClient.invalidateQueries({ queryKey: noteKeys.all });
      return result;
    },
    [getApiToken, invalidate, queryClient],
  );

  const deleteRecording = useCallback(
    async (args: { recordingId: Id<"recordings"> }) => {
      const token = await getApiToken();
      await recordingsApi.delete(token, args.recordingId);
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const cleanupOrphanedRecordings = useCallback(async () => {
    const token = await getApiToken();
    const result = await recordingsApi.cleanupOrphaned(token);
    invalidate();
    return result;
  }, [getApiToken, invalidate]);

  return {
    upsertDraft,
    saveUploadedRecording,
    processRecording,
    deleteRecording,
    cleanupOrphanedRecordings,
  };
}
