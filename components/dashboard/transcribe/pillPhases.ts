/**
 * Pure state/label logic for the transcription pill.
 *
 * Kept free of React so the phase machine and its copy can be unit tested
 * without mounting audio hardware or Convex.
 */

import type { JobStatus, RecordingStage } from "@/types/api/jobs";

/** Faces for a background recording job, one per pipeline stage. */
export type JobPhase =
  | "queued"
  | "transcribing"
  | "researching"
  | "writing"
  | "checking"
  | "saving"
  | "retrying"
  | "failed"
  | "ready";

export type PillPhase =
  | "idle"
  | "listening"
  | "isolating"
  | "paused"
  | "thinking"
  | "searching"
  | JobPhase;

/** The part of a job the pill reads (see GET /jobs/:id). */
export type PillJob = { status: JobStatus; stage: RecordingStage | null };

export type PillPhaseInput = {
  isRecording: boolean;
  isIsolating?: boolean;
  isThinking: boolean;
  isSearchOpen: boolean;
  hasTranscript: boolean;
  /** The recording job the pill is following, if any. */
  job?: PillJob | null;
};

/** The pipeline in order, as the pill's step dots show it. */
export const JOB_STEPS: readonly RecordingStage[] = [
  "transcribe",
  "research",
  "generate",
  "validate",
  "save",
];

const STAGE_PHASE: Record<RecordingStage, JobPhase> = {
  transcribe: "transcribing",
  research: "researching",
  generate: "writing",
  validate: "checking",
  save: "saving",
};

const JOB_PHASES: readonly string[] = [
  "queued", "transcribing", "researching", "writing", "checking", "saving", "retrying", "failed", "ready",
] satisfies JobPhase[];

export const isJobPhase = (phase: PillPhase): phase is JobPhase => JOB_PHASES.includes(phase);

export function jobPhase(job: PillJob): JobPhase {
  switch (job.status) {
    case "succeeded":
      return "ready";
    case "failed":
      return "failed";
    case "retrying":
      return "retrying";
    case "queued":
      return "queued";
    default:
      return job.stage ? STAGE_PHASE[job.stage] : "queued";
  }
}

/** Index of the job's current step in JOB_STEPS: -1 before it starts, JOB_STEPS.length once done. */
export function jobStepIndex(job: PillJob): number {
  if (job.status === "succeeded") return JOB_STEPS.length;
  return job.stage ? JOB_STEPS.indexOf(job.stage) : -1;
}

/**
 * Single source of truth for which face the pill shows.
 *
 * Ordering is deliberate: an explicit search overlay wins over everything, then
 * live audio, then work the user is waiting on right now, then a session that
 * still needs generating. A background job only shows when nothing more
 * immediate is going on, so starting a new recording never hides behind it.
 */
export function resolvePhase({
  isRecording,
  isIsolating,
  isThinking,
  isSearchOpen,
  hasTranscript,
  job,
}: PillPhaseInput): PillPhase {
  if (isSearchOpen) return "searching";
  if (isRecording) return "listening";
  if (isIsolating) return "isolating";
  if (isThinking) return "thinking";
  if (hasTranscript) return "paused";
  if (job) return jobPhase(job);
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

/** Captions while the captured audio uploads, after the mic closes. */
export const SAVING_STAGES = ["Saving the recording"] as const;

/**
 * Captions while the session is handed to the worker. Transcription and
 * generation happen in the background after this, in the note itself.
 */
export const QUEUEING_STAGES = ["Starting note generation"] as const;

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
      return "Saving the recording";
    case "paused":
      return "Paused";
    case "thinking":
      return "Starting note generation";
    case "queued":
      return "Waiting for a free worker";
    case "transcribing":
      return "Transcribing";
    case "researching":
      return "Reading your sources";
    case "writing":
      return "Writing notes";
    case "checking":
      return "Checking depth";
    case "saving":
      return "Adding to your note";
    case "retrying":
      return "Retrying shortly";
    case "failed":
      return "Couldn't generate notes";
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
