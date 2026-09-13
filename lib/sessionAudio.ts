/** MediaRecorder MIME types, preferred first. */
export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

export type CapturedSessionAudio = {
  blob: Blob;
  mimeType: string;
};

export const TRANSCRIPTION_DRAFT_STORAGE_KEY =
  "lumina:transcription-pill:draft:v1";

export type TranscriptionDraft = {
  version: 1;
  savedAt: number;
  sessionId: string;
  elapsed: number;
  chunks: string[];
  liveTranscript: string;
};

/** Parse a locally recovered draft without trusting persisted browser data. */
export function parseTranscriptionDraft(raw: string): TranscriptionDraft | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;

    const draft = value as Record<string, unknown>;
    if (
      draft.version !== 1 ||
      typeof draft.savedAt !== "number" ||
      !Number.isFinite(draft.savedAt) ||
      typeof draft.sessionId !== "string" ||
      draft.sessionId.trim().length === 0 ||
      typeof draft.elapsed !== "number" ||
      !Number.isFinite(draft.elapsed) ||
      draft.elapsed < 0 ||
      !Array.isArray(draft.chunks) ||
      !draft.chunks.every((chunk) => typeof chunk === "string") ||
      typeof draft.liveTranscript !== "string"
    ) {
      return null;
    }

    return {
      version: 1,
      savedAt: draft.savedAt,
      sessionId: draft.sessionId,
      elapsed: Math.floor(draft.elapsed),
      chunks: draft.chunks.filter((chunk) => chunk.trim().length > 0),
      liveTranscript: draft.liveTranscript.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * First MIME type this browser can actually record. Empty string means
 * MediaRecorder should be constructed without a type hint.
 */
export function pickRecorderMimeType(
  isSupported: (type: string) => boolean = defaultMimeSupported,
): string {
  return RECORDER_MIME_CANDIDATES.find((type) => isSupported(type)) ?? "";
}

function defaultMimeSupported(type: string): boolean {
  return (
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)
  );
}

/** Strip codec parameters so Convex storage and ElevenLabs see a container type. */
export function recorderContainerMime(mimeType: string): string {
  const container = mimeType.split(";")[0]?.trim();
  return container && container.length > 0 ? container : "audio/webm";
}
