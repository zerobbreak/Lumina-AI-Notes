/**
 * Pure state/label logic for the transcription pill.
 *
 * Kept free of React so the phase machine and its copy can be unit tested
 * without mounting audio hardware or Convex.
 */

export type PillPhase =
  | "idle"
  | "listening"
  | "isolating"
  | "paused"
  | "thinking"
  | "ready"
  | "searching";

export type PillPhaseInput = {
  isRecording: boolean;
  isIsolating?: boolean;
  isThinking: boolean;
  isSearchOpen: boolean;
  hasTranscript: boolean;
  hasNotes: boolean;
};

/**
 * Single source of truth for which face the pill shows.
 *
 * Ordering is deliberate: an explicit search overlay wins over everything, then
 * live audio, then background work, so the pill never claims to be listening
 * while the mic is closed.
 */
export function resolvePhase({
  isRecording,
  isIsolating,
  isThinking,
  isSearchOpen,
  hasTranscript,
  hasNotes,
}: PillPhaseInput): PillPhase {
  if (isSearchOpen) return "searching";
  if (isRecording) return "listening";
  if (isIsolating) return "isolating";
  if (isThinking) return "thinking";
  if (hasNotes) return "ready";
  if (hasTranscript) return "paused";
  return "idle";
}

/**
 * Cross-fading captions for the thinking state. Each entry is a real stage of
 * the pipeline rather than filler, so a long generation still reads as progress.
 */
export const THINKING_STAGES = [
  "Reading the transcript",
  "Pulling out key ideas",
  "Structuring your notes",
  "Tightening the wording",
] as const;

/** Captions while ElevenLabs strips background noise from the take. */
export const ISOLATING_STAGES = [
  "Isolating speech",
  "Removing background noise",
] as const;

/** Milliseconds each thinking caption holds before the next fades in. */
export const THINKING_STAGE_MS = 2200;

/**
 * Caption index for an elapsed duration. Holds on the final stage rather than
 * looping — restarting at "Reading the transcript" would read as a stall.
 */
export function thinkingStageIndex(
  elapsedMs: number,
  stageCount: number = THINKING_STAGES.length,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(stageCount - 1, Math.floor(elapsedMs / THINKING_STAGE_MS));
}

/** `m:ss` for short sessions, `h:mm:ss` once past an hour. */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Short status line shown beside the pill's icon. */
export function phaseLabel(phase: PillPhase): string {
  switch (phase) {
    case "listening":
      return "Listening";
    case "isolating":
      return "Isolating speech";
    case "paused":
      return "Paused";
    case "thinking":
      return "Thinking";
    case "ready":
      return "Notes ready";
    case "searching":
      return "Search notes";
    default:
      return "Transcribe session";
  }
}

/**
 * Idle bar heights so the resting pill still reads as an audio control.
 * Deterministic (no Math.random) to keep server and client markup identical.
 */
export function idleWaveform(bandCount: number): number[] {
  return Array.from({ length: bandCount }, (_, i) => {
    const wave = Math.sin((i / Math.max(1, bandCount - 1)) * Math.PI);
    // Full 0.1–1 span: the resting bars are scaled down hard by the renderer,
    // so a wide range here is what keeps the arc legible instead of flat.
    return 0.1 + wave * 0.9;
  });
}

/**
 * Mirror raw analyser bands around the pill's centre so the waveform reads as a
 * symmetric meter rather than a left-weighted spectrum.
 */
export function mirrorLevels(levels: number[]): number[] {
  if (levels.length === 0) return [];
  const half = Math.ceil(levels.length / 2);
  const head = levels.slice(0, half);
  return [...[...head].reverse(), ...head];
}
