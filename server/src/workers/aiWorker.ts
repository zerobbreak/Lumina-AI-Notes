import { type Job, UnrecoverableError, Worker } from "bullmq";
import { runProcessDocument } from "../ai/processDocument.js";
import { withAiUsageScope } from "../ai/usageContext.js";
import type { Env } from "../env.js";
import { processRecordingJob } from "../pipelines/recording/processRecording.js";
import { AI_QUEUE, redisConnection, RETRY_DELAYS_MS, type AiJobData, type AiJobName } from "../queue/queues.js";
import type { WorkerContext } from "./context.js";

/**
 * Consumes the AI queue: recording -> notes pipelines and PDF processing.
 * Safe to run on any number of replicas; each job goes to exactly one.
 */
export function startAiWorker(ctx: WorkerContext, env: Env) {
  async function runAiJob(job: Job<AiJobData, unknown, AiJobName>) {
    const data = job.data;
    switch (data.kind) {
      case "recording.process":
        // attemptsMade counts earlier failed attempts of this job.
        return processRecordingJob(
          { db: ctx.db, storage: ctx.storage, keys: { gemini: env.GEMINI_API_KEY, elevenLabs: env.ELEVENLABS_API_KEY } },
          data.processingJobId,
          { isFinalAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1) },
        );
      case "document.process": {
        if (!env.GEMINI_API_KEY) {
          throw new UnrecoverableError("GEMINI_API_KEY is not set on the worker");
        }
        // Records success or failure on the file row itself.
        return runProcessDocument(ctx.db, ctx.storage, data.fileId, data.userId, env.GEMINI_API_KEY);
      }
      default:
        throw new UnrecoverableError(`Unknown AI job: ${job.name}`);
    }
  }

  const worker = new Worker<AiJobData, unknown, AiJobName>(
    AI_QUEUE,
    (job) =>
      // The recording pipeline learns its user from the job row (setAiUsageUser).
      withAiUsageScope(
        { db: ctx.db, userId: job.data.kind === "document.process" ? job.data.userId : null, feature: job.data.kind },
        () => runAiJob(job),
      ),
    {
      connection: redisConnection(env.REDIS_URL, "worker"),
      prefix: env.QUEUE_PREFIX,
      concurrency: env.AI_WORKER_CONCURRENCY,
      limiter: { max: env.AI_WORKER_RATE_PER_MIN, duration: 60_000 },
      settings: {
        backoffStrategy: (attemptsMade) =>
          RETRY_DELAYS_MS[Math.min(attemptsMade, RETRY_DELAYS_MS.length) - 1] ?? RETRY_DELAYS_MS[0],
      },
    },
  );

  worker.on("failed", (job, error) => {
    console.error(`[ai-worker] ${job?.name} ${job?.id} failed (attempt ${job?.attemptsMade}):`, error.message);
  });
  worker.on("error", (error) => console.error("[ai-worker] error:", error));
  return worker;
}
