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
