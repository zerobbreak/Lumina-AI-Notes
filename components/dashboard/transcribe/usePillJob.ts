"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import { useJobActions } from "@/lib/hooks/jobs/useJobActions";
import { useJob } from "@/lib/queries/jobs/useJob";
import { useNoteDetail } from "@/lib/queries/notes/useNoteDetail";

/** Survives reloads, so a long generation keeps showing its progress. */
const STORAGE_KEY = "lumina.pill.jobId";
/** How long "Notes ready" stays up once the user is already looking at the note. */
const READY_LINGER_MS = 4_000;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(jobId: string | null) {
  try {
    if (jobId) window.localStorage.setItem(STORAGE_KEY, jobId);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: progress just won't survive a reload.
  }
}

/**
 * The recording job the pill follows: the one it started, or one already
 * running on the note that's open (e.g. after a reload on another tab).
 * Polling, and refreshing the note when the job finishes, happen in useJob.
 */
export function usePillJob(openNoteId: string | null) {
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: openNote } = useNoteDetail(openNoteId);
  const { data: job, error } = useJob(jobId);
  const { retryJob, dismissJob } = useJobActions();
  const [isActing, setIsActing] = useState(false);

  const track = useCallback((id: string | null) => {
    setJobId(id);
    writeStored(id);
  }, []);

  // Pick the stored job back up after mount (localStorage isn't there during SSR).
  useEffect(() => {
    const stored = readStored();
    if (stored) setJobId(stored);
  }, []);

  const openNoteJobId = openNote?.generationJobId;
  useEffect(() => {
    if (!jobId && openNoteJobId) track(openNoteJobId);
  }, [jobId, openNoteJobId, track]);

  // A job that's gone (deleted with its note, or another account's) stops being followed.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) track(null);
  }, [error, track]);

  // Nothing left to act on once the finished notes are already on screen.
  const readyOnScreen = job?.status === "succeeded" && job.noteId === openNoteId;
  useEffect(() => {
    if (!readyOnScreen) return;
    const timer = setTimeout(() => track(null), READY_LINGER_MS);
    return () => clearTimeout(timer);
  }, [readyOnScreen, track]);

  const act = useCallback(async (action: () => Promise<unknown>, failure: string) => {
    setIsActing(true);
    try {
      await action();
    } catch (e) {
      toast.error(failure, { description: e instanceof Error ? e.message : undefined });
    } finally {
      setIsActing(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (!job) return;
    void act(() => retryJob(job.id), "Couldn't retry");
  }, [act, job, retryJob]);

  /** Stops following the job; a failed one also unlocks its note. */
  const dismiss = useCallback(() => {
    if (job?.status === "failed" && job.noteId) {
      const noteId = job.noteId;
      void act(async () => {
        await dismissJob(job.id, noteId);
        track(null);
      }, "Couldn't dismiss");
      return;
    }
    track(null);
  }, [act, dismissJob, job, track]);

  return { job: jobId ? job ?? null : null, track, retry, dismiss, isActing };
}
