import { and, eq } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "../db/client.js";
import { notes, processingJobs } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { consumeAiQuota } from "../middleware/ai-rate-limit.js";
import { currentUser } from "../middleware/user.js";
import type { JobQueue } from "../queue/queues.js";

type JobRow = typeof processingJobs.$inferSelect;

/** What the client polls. Inputs and checkpoints stay server-side. */
export function toJobResponse(job: JobRow) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    error: job.error,
    noteId: job.noteId,
    recordingId: job.recordingId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt,
  };
}

/**
 * Sends a queued job to the worker. If Redis refuses, the job is marked
 * failed (so the note offers a retry) rather than left queued forever.
 */
export async function enqueueOrFail(db: Db, queue: JobQueue, job: Pick<JobRow, "id" | "run">) {
  try {
    await queue.enqueueRecording(job.id, job.run);
  } catch (error) {
    console.error(`[jobs] couldn't enqueue ${job.id}:`, error);
    await db
      .update(processingJobs)
      .set({ status: "failed", error: "Couldn't start processing. Please try again.", finishedAt: new Date() })
      .where(eq(processingJobs.id, job.id));
    throw new HttpError(503, "Background processing is unavailable right now. Please try again.", "queue_unavailable");
  }
}

export function createJobsRouter(db: Db, queue: JobQueue) {
  const router = Router();

  async function findOwned(jobId: string, userId: string) {
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(and(eq(processingJobs.id, jobId), eq(processingJobs.userId, userId)))
      .limit(1);
    if (!job) throw new HttpError(404, "Job not found", "not_found");
    return job;
  }

  router.get("/:id", async (req, res) => {
    res.json(toJobResponse(await findOwned(req.params.id, currentUser(res).id)));
  });

  // Starts a failed job again, from its last checkpoint.
  router.post("/:id/retry", async (req, res) => {
    const user = currentUser(res);
    const job = await findOwned(req.params.id, user.id);
    if (job.status !== "failed") {
      throw new HttpError(409, "Only a failed job can be retried", "not_failed");
    }
    if (!job.noteId) {
      throw new HttpError(409, "The note for this job was deleted", "note_deleted");
    }
    await consumeAiQuota(db, user);

    const [updated] = await db.transaction(async (tx) => {
      // Locks the note again, in case the failure was dismissed.
      await tx.update(notes).set({ generationJobId: job.id }).where(eq(notes.id, job.noteId!));
      return tx
        .update(processingJobs)
        .set({ status: "queued", error: null, finishedAt: null, run: job.run + 1 })
        .where(and(eq(processingJobs.id, job.id), eq(processingJobs.status, "failed")))
        .returning();
    });
    if (!updated) {
      throw new HttpError(409, "This job was already retried", "not_failed");
    }
    await enqueueOrFail(db, queue, updated);
    res.status(202).json(toJobResponse(updated));
  });

  // Gives up on a failed job: unlocks its note so it can be edited again.
  router.post("/:id/dismiss", async (req, res) => {
    const job = await findOwned(req.params.id, currentUser(res).id);
    if (job.status !== "failed") {
      throw new HttpError(409, "Only a failed job can be dismissed", "not_failed");
    }
    if (job.noteId) {
      await db
        .update(notes)
        .set({ generationJobId: null })
        .where(and(eq(notes.id, job.noteId), eq(notes.generationJobId, job.id)));
    }
    res.status(204).end();
  });

  return router;
}
