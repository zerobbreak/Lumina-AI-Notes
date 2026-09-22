/** Port of convex/shared/audioIsolation.ts */

export const ISOLATED_AUDIO_MIME = "audio/mpeg";

export const ELEVENLABS_ISOLATION_URL = "https://api.elevenlabs.io/v1/audio-isolation";

export const MAX_ISOLATION_BYTES = 50 * 1024 * 1024;
export const MIN_ISOLATION_BYTES = 256;
export const ISOLATION_TIMEOUT_MS = 180_000;

export function isolationFileName(mimeType: string): string {
  const subtype = mimeType.split(";")[0]?.split("/")[1]?.toLowerCase() ?? "";
  if (subtype.includes("webm")) return "session.webm";
  if (subtype.includes("mpeg") || subtype.includes("mp3")) return "session.mp3";
  if (subtype.includes("wav")) return "session.wav";
  if (subtype.includes("ogg")) return "session.ogg";
  if (subtype.includes("flac")) return "session.flac";
  if (subtype.includes("mp4") || subtype.includes("m4a") || subtype.includes("aac")) {
    return "session.m4a";
  }
  return "session.audio";
}

export function shouldAttemptIsolation(byteLength: number): boolean {
  return byteLength >= MIN_ISOLATION_BYTES && byteLength <= MAX_ISOLATION_BYTES;
}

export function isolationErrorMessage(status: number, bodyText: string): string {
  if (status === 401 || status === 403) {
    return "Audio isolation is not available. Check the ElevenLabs API key.";
  }
  if (status === 429) {
    return "Audio isolation is rate-limited. Try again in a moment.";
  }
  if (status === 413) {
    return "That recording is too large to isolate.";
  }
  const lower = bodyText.toLowerCase();
  if (lower.includes("quota") || lower.includes("credit")) {
    return "Audio isolation quota exceeded. Try again later.";
  }
  if (status >= 500) {
    return "ElevenLabs is temporarily unavailable for audio isolation.";
  }
  return "Couldn't isolate speech from the recording.";
}
