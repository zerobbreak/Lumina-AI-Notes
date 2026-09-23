import { UnrecoverableError } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  notes,
  processingJobs,
  recordings,
  users,
  type ProcessingJobStatus,
  type RecordingJobCheckpoint,
  type RecordingStage,
} from "../../db/schema/index.js";
import { clientMessage, UserFacingError } from "../../ai/errors.js";
import { normalizeTranscriptForPrompt } from "../../ai/transcript.js";
import { isTransientError } from "../../queue/errors.js";
import { chargeAudioMinutes } from "../../recordings/usage.js";
import type { Storage } from "../../storage/s3.js";
import { generateDraft, geminiModels, research, validateDraft } from "./notes.js";
import { structuredNotesToHtml } from "./toHtml.js";
import { transcribeAudio, type TranscribeKeys } from "./transcribe.js";

export type RecordingJobDeps = {
  db: Db;
  storage: Storage;
  keys: TranscribeKeys;
  log?: Pick<Console, "log" | "warn" | "error">;
};

/** Progress shown when each stage starts. */
const STAGE_PROGRESS: Record<RecordingStage, number> = {
  transcribe: 10,
  research: 35,
  generate: 55,
  validate: 80,
  save: 95,
};

const FAILURE_MESSAGE = "Couldn't generate notes from this recording";

/**
 * Runs a recording job: transcribe -> research -> generate -> validate -> save.
 * Each stage's output is checkpointed on the processing_jobs row, so a retry
 * (or a redeploy that kills the worker mid-job) resumes at the stage that
 * failed. `isFinalAttempt` says whether BullMQ will try again if this throws.
 *
 * Throws on failure so BullMQ retries it; errors that retrying can't fix are
 * thrown as UnrecoverableError, which BullMQ doesn't retry.
 */
export async function processRecordingJob(
  deps: RecordingJobDeps,
  processingJobId: string,
  { isFinalAttempt }: { isFinalAttempt: boolean },
): Promise<void> {
  const { db } = deps;
  const log = deps.log ?? console;
  const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, processingJobId)).limit(1);
  if (!job) {
    log.warn(`[recording] job ${processingJobId} no longer exists; skipping`);
    return;
  }
  if (job.status === "succeeded" || job.status === "failed") return;

  const setJob = (patch: Partial<typeof processingJobs.$inferInsert>) =>
    db.update(processingJobs).set(patch).where(eq(processingJobs.id, job.id));

  await db
    .update(processingJobs)
    .set({
      status: "running",
      error: null,
      attempts: sql`${processingJobs.attempts} + 1`,
      startedAt: job.startedAt ?? new Date(),
    })
    .where(eq(processingJobs.id, job.id));

  const checkpoint: RecordingJobCheckpoint = { ...job.checkpoint };
  const enter = (stage: RecordingStage) => setJob({ stage, progress: STAGE_PROGRESS[stage] });
  const save = () => setJob({ checkpoint });

  try {
    const { input } = job;
    const options = { title: input.title, pinnedFileId: input.pinnedFileId, referenceUrls: input.referenceUrls };

    if (checkpoint.transcript === undefined) {
      await enter("transcribe");
      checkpoint.transcript = await transcribeStage(deps, job.userId, input, checkpoint, save, log);
      if (job.recordingId) {
        await db
          .update(recordings)
          .set({ transcript: toStoredTranscript(checkpoint.transcript) })
          .where(eq(recordings.id, job.recordingId));
      }
      await save();
    }

    const models = geminiModels(deps.keys.gemini);

    if (!checkpoint.research) {
      await enter("research");
      checkpoint.research = await research(db, models, job.userId, checkpoint.transcript, options);
      await save();
    }

    if (checkpoint.draft === undefined) {
      await enter("generate");
      checkpoint.draft = await generateDraft(models, checkpoint.research, options);
      await save();
    }

    if (checkpoint.html === undefined) {
      await enter("validate");
      const structured = await validateDraft(
        models,
        checkpoint.research,
        checkpoint.draft as Parameters<typeof validateDraft>[2],
        options,
      );
      checkpoint.html = structuredNotesToHtml(structured);
      checkpoint.title = structured.title;
      await save();
    }

    await enter("save");
    await saveNote(db, job, checkpoint.html, checkpoint.title);
    log.log(`[recording] job ${job.id} succeeded`);
  } catch (error) {
    const transient = isTransientError(error);
    const message = clientMessage(error, FAILURE_MESSAGE);
    const status: ProcessingJobStatus = transient && !isFinalAttempt ? "retrying" : "failed";
    log.error(`[recording] job ${job.id} ${status} at ${transient ? "transient" : "permanent"} error:`, error);
    await setJob({ status, error: message, ...(status === "failed" && { finishedAt: new Date() }) });
    if (!transient) throw new UnrecoverableError(message);
    throw error;
  }
}

async function transcribeStage(
  deps: RecordingJobDeps,
  userId: string,
  input: (typeof processingJobs.$inferSelect)["input"],
  checkpoint: RecordingJobCheckpoint,
  save: () => Promise<unknown>,
  log: Pick<Console, "warn">,
): Promise<string> {
  const live = input.liveTranscript?.trim() ?? "";
  if (!input.audioStorageKey) {
    if (!live) throw new UserFacingError("This recording has no audio or transcript to work from");
    return live;
  }

  const [owner] = await deps.db.select({ clerkUserId: users.clerkUserId }).from(users).where(eq(users.id, userId));
  try {
    const { transcript } = await transcribeAudio(
      deps.storage,
      deps.keys,
      {
        storageKey: input.audioStorageKey,
        mimeType: input.mimeType || "audio/webm",
        clerkUserId: owner.clerkUserId,
        courseContext: input.courseContext,
      },
      log,
    );
    if (!checkpoint.audioCharged) {
      await chargeAudioMinutes(deps.db, userId, (input.durationSeconds ?? 0) / 60);
      checkpoint.audioCharged = true;
      // Saved at once: a crash before the transcript's checkpoint mustn't charge twice.
      await save();
    }
    if (transcript) return transcript;
    if (live) return live;
    throw new UserFacingError("No speech was found in this recording");
  } catch (error) {
    // The browser's live transcript is a worse but real fallback: better
    // notes from it now than a failed job, whatever went wrong with the audio.
    if (live && !(error instanceof UserFacingError && error.message.startsWith("No speech"))) {
      log.warn("[recording] audio transcription failed; using the live transcript:", error);
      return live;
    }
    throw error;
  }
}

/** Same chunk-array shape the pill's drafts store, so the sidebar can replay it. */
function toStoredTranscript(transcript: string) {
  const text = normalizeTranscriptForPrompt(transcript);
  return JSON.stringify([{ text, enhancedText: text, isImportant: false, concepts: [] }]);
}

/**
 * Titles the app gives a note before it has real content. Only these are
 * replaced by the generated title, so a title the user typed is kept.
 */
const PLACEHOLDER_TITLES = new Set(["", "untitled", "untitled note", "session notes", "new note"]);

export function hasPlaceholderTitle(title: string | null): boolean {
  return PLACEHOLDER_TITLES.has((title ?? "").trim().toLowerCase());
}

async function saveNote(db: Db, job: typeof processingJobs.$inferSelect, html: string, title?: string) {
  if (!job.noteId) {
    throw new UserFacingError("The note was deleted before its notes were ready");
  }
  await db.transaction(async (tx) => {
    const [note] = await tx
      .select({ title: notes.title, content: notes.content })
      .from(notes)
      .where(and(eq(notes.id, job.noteId!), eq(notes.userId, job.userId)))
      .limit(1);
    if (!note) {
      throw new UserFacingError("The note was deleted before its notes were ready");
    }
    const content = job.input.append && note.content?.trim() ? `${note.content}${html}` : html;
    await tx
      .update(notes)
      .set({
        content,
        ...(title && hasPlaceholderTitle(note.title) && { title }),
        wordCount: content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
        // A content change like any other save, so a stale editor gets a conflict.
        version: sql`${notes.version} + 1`,
        generationJobId: null,
      })
      .where(eq(notes.id, job.noteId!));
    await tx
      .update(processingJobs)
      .set({ status: "succeeded", stage: null, progress: 100, error: null, finishedAt: new Date() })
      .where(eq(processingJobs.id, job.id));
  });
}
