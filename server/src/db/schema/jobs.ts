import { index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz, updatedAt } from "./columns.js";
import { notes } from "./notes.js";
import { recordings } from "./recordings.js";
import { users } from "./users.js";

export type ProcessingJobType = "recording.process";

/** queued -> running -> (retrying -> running)* -> succeeded | failed */
export type ProcessingJobStatus = "queued" | "running" | "retrying" | "succeeded" | "failed";

export type RecordingStage = "transcribe" | "research" | "generate" | "validate" | "save";

/** What the user asked for when they started the job. */
export type RecordingJobInput = {
  title: string;
  /** Bucket key of the captured or imported audio; transcribed when present. */
  audioStorageKey?: string;
  mimeType?: string;
  /** Browser speech-recognition text: used when there's no audio, or its transcription fails. */
  liveTranscript?: string;
  /** Minutes charged once the audio is transcribed. */
  durationSeconds?: number;
  courseContext?: string;
  pinnedFileId?: string;
  referenceUrls?: string[];
  /** Add below what the note already has, rather than filling an empty placeholder. */
  append: boolean;
};

/**
 * Each finished stage's output, so a retry or a redeploy mid-job resumes at
 * the stage that failed instead of paying for the earlier ones again.
 */
export type RecordingJobCheckpoint = {
  transcript?: string;
  audioCharged?: boolean;
  research?: {
    enrichedTranscript: string;
    referenceUrlsBlock: string;
    pinnedContext: string;
  };
  draft?: unknown;
  html?: string;
  /** Generated title; applied only if the note still has a placeholder one. */
  title?: string;
};

/**
 * Durable record of background AI work. BullMQ in Redis only carries the job
 * id; status, progress and results live here, so a Redis flush loses nothing
 * the user can see.
 */
export const processingJobs = pgTable(
  "processing_jobs",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().$type<ProcessingJobType>().notNull(),
    status: text().$type<ProcessingJobStatus>().notNull().default("queued"),
    stage: text().$type<RecordingStage>(),
    progress: integer().notNull().default(0),
    /** Safe to show the user (see ai/errors.ts clientMessage). */
    error: text(),
    /** Worker attempts across every run. */
    attempts: integer().notNull().default(0),
    /** Bumped by each user retry; part of the BullMQ job id so a retry is a new queue entry. */
    run: integer().notNull().default(1),
    recordingId: text().references(() => recordings.id, { onDelete: "cascade" }),
    noteId: text().references(() => notes.id, { onDelete: "set null" }),
    input: jsonb().$type<RecordingJobInput>().notNull(),
    checkpoint: jsonb().$type<RecordingJobCheckpoint>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    startedAt: timestamptz(),
    finishedAt: timestamptz(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.recordingId), index().on(t.noteId)],
);
