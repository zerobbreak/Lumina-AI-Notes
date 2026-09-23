import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type {
  AudioLimitDto,
  CleanupOrphanedResultDto,
  RecordingDto,
} from "@/types/api/recordings";


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
