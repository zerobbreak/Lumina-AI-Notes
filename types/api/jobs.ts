export type JobStatus = "queued" | "running" | "retrying" | "succeeded" | "failed";

export type RecordingStage = "transcribe" | "research" | "generate" | "validate" | "save";

/** GET /jobs/:id: a background AI job's progress. */
export type JobDto = {
  id: string;
  type: "recording.process";
  status: JobStatus;
  stage: RecordingStage | null;
  progress: number;
  /** Safe to show the user. */
  error: string | null;
  noteId: string | null;
  recordingId: string | null;
  createdAt: number;
  updatedAt: number;
  finishedAt: number | null;
};

/** POST /recordings/process */
export type ProcessRecordingResultDto = {
  job: JobDto;
  noteId: string;
  recordingId: string;
};

export const isJobActive = (status: JobStatus | undefined) =>
  status === "queued" || status === "running" || status === "retrying";
