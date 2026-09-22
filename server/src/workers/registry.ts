import { sendDueReminders } from "../deadlines/sendReminders.js";
import { recomputeFileQueuePositions } from "../files/processing.js";
import type { WorkerContext, WorkerJob } from "./context.js";
import { buildDailyQueues } from "./jobs/buildDailyQueues.js";
import { cleanupStalePresence } from "./jobs/cleanupPresence.js";
import { cleanupStaleNotesAndFiles } from "./jobs/cleanupStale.js";
import { resetStreaks } from "./jobs/resetStreaks.js";
import { initializeSrsFields } from "./jobs/srsBackfill.js";

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Mirrors convex/crons.ts intervals. */
export const workerJobs = {
  "deadline-reminders": {
    description: "Turn due deadline reminders into in-app notifications",
    intervalMs: 10 * MINUTE,
    run: async ({ db }) => sendDueReminders(db, 10),
  },
  "srs-backfill": {
    description: "Backfill missing SRS fields on flashcards",
    intervalMs: 6 * HOUR,
    run: async ({ db }) => initializeSrsFields(db, 200),
  },
  "srs-daily-queues": {
    description: "Build or refresh today’s flashcard review queues",
    intervalMs: 6 * HOUR,
    run: async ({ db }) => buildDailyQueues(db),
  },
  "file-queue-positions": {
    description: "Recompute document processing queue positions",
    intervalMs: 4 * HOUR,
    run: async ({ db }) => recomputeFileQueuePositions(db),
  },
  "cleanup-stale": {
    description: "Delete notes and files not accessed within the retention window",
    intervalMs: 24 * HOUR,
    run: async ({ db, storage }) =>
      cleanupStaleNotesAndFiles(db, storage, {
        maxAgeMs: 30 * 24 * 60 * 60 * 1000,
        perUserLimit: 200,
      }),
  },
  "presence-cleanup": {
    description: "Delete stale note presence rows",
    intervalMs: 6 * HOUR,
    run: async ({ db }) => cleanupStalePresence(db),
  },
  "streak-reset": {
    description: "Zero out study streaks when the user missed yesterday",
    intervalMs: 24 * HOUR,
    run: async ({ db }) => resetStreaks(db),
  },
} satisfies Record<string, WorkerJob>;

export type WorkerJobName = keyof typeof workerJobs;

export function listWorkerJobNames(): WorkerJobName[] {
  return Object.keys(workerJobs) as WorkerJobName[];
}

export async function runWorkerJob(name: WorkerJobName, ctx: WorkerContext) {
  const job = workerJobs[name];
  if (!job) {
    throw new Error(`Unknown worker job: ${name}`);
  }
  return job.run(ctx);
}
