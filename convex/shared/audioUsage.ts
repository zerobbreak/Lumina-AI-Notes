const MAX_AUDIO_DURATION_SECONDS = 24 * 60 * 60;

/**
 * Reject missing or implausible durations before reserving paid audio work.
 * Durations originate from server-side parsing of the stored audio.
 */
export function audioDurationMinutes(durationSeconds: number): number | null {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > MAX_AUDIO_DURATION_SECONDS
  ) {
    return null;
  }

  return durationSeconds / 60;
}
