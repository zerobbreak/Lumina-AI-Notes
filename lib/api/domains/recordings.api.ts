import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type {
  AudioLimitDto,
  CleanupOrphanedResultDto,
  RecordingDto,
} from "@/types/api/recordings";
import type { ProcessRecordingResultDto } from "@/types/api/jobs";

export type ProcessRecordingBody = {
  /** The pill's session id; the recording row is created or updated by it. */
  sessionId?: string;
  /** Re-generate from a saved recording's transcript instead. */
  recordingId?: string;
  title: string;
  /** Audio already uploaded to the bucket. */
  storageKey?: string;
  mimeType?: string;
  /** Browser speech-recognition text: a fallback if the audio can't be transcribed. */
  liveTranscript?: string;
  /** Seconds. */
  duration?: number;
  /** Add the notes below this note's content instead of creating a new note. */
  targetNoteId?: string;
  noteTitle?: string;
  major?: string;
  courseContext?: string;
  pinnedFileId?: string;
  referenceUrls?: string[];
  tzOffsetMinutes?: number;
};

export const recordingsApi = {
  list(token: string) {
    return apiFetch<RecordingDto[]>(apiPath`/recordings`, { token });
  },

  getById(token: string, recordingId: string) {
    return apiFetch<RecordingDto>(apiPath`/recordings/${recordingId}`, { token });
  },

  checkAudioLimit(token: string, estimatedMinutes?: number) {
    return apiFetch<AudioLimitDto>(apiPath`/recordings/audio-limit`, { query: { estimatedMinutes }, token });
  },

  upsertDraft(
    token: string,
    body: {
      sessionId: string;
      title: string;
      transcript: string;
      duration?: number;
    },
  ) {
    return apiFetch<RecordingDto>(apiPath`/recordings/draft`, {
      method: "PUT",
      token,
      body,
    });
  },

  saveUploaded(
    token: string,
    body: {
      title: string;
      storageKey: string;
      duration?: number;
      sessionId?: string;
      tzOffsetMinutes?: number;
    },
  ) {
    return apiFetch<RecordingDto>(apiPath`/recordings/uploaded`, {
      method: "POST",
      token,
      body,
    });
  },

  save(
    token: string,
    body: {
      sessionId: string;
      title: string;
      transcript: string;
      duration?: number;
      tzOffsetMinutes?: number;
    },
  ) {
    return apiFetch<RecordingDto>(apiPath`/recordings`, {
      method: "POST",
      token,
      body,
    });
  },

  /**
   * Hands a session to the worker: transcription, research and note
   * generation run in the background. Returns at once with the job to poll
   * and the note it will write into.
   */
  process(token: string, body: ProcessRecordingBody) {
    return apiFetch<ProcessRecordingResultDto>(apiPath`/recordings/process`, {
      method: "POST",
      token,
      body,
    });
  },

  updateTranscript(token: string, recordingId: string, transcript: string) {
    return apiFetch<void>(apiPath`/recordings/${recordingId}/transcript`, {
      method: "PATCH",
      token,
      body: { transcript },
    });
  },

  delete(token: string, recordingId: string) {
    return apiFetch<void>(apiPath`/recordings/${recordingId}`, {
      method: "DELETE",
      token,
    });
  },

  cleanupOrphaned(token: string) {
    return apiFetch<CleanupOrphanedResultDto>(apiPath`/recordings/cleanup-orphaned`, {
      method: "POST",
      token,
    });
  },
};
