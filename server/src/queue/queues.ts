import { Queue, type ConnectionOptions } from "bullmq";

/** AI pipelines: slow, rate limited, retried. */
export const AI_QUEUE = "ai";
/** The cron-style jobs in workers/registry.ts, run by BullMQ job schedulers. */
export const MAINTENANCE_QUEUE = "maintenance";

export type AiJobData =
  | { kind: "recording.process"; processingJobId: string }
  | { kind: "document.process"; fileId: string; userId: string };

export type AiJobName = AiJobData["kind"];

/**
 * BullMQ creates its own ioredis clients from these. `family: 0` lets them
 * resolve Railway's IPv6-only private hostnames. Workers block on Redis, so
 * their commands must never time out (`maxRetriesPerRequest: null`); the API
 * fails fast instead, so a Redis outage is an error, not a hung request.
 */
export function redisConnection(url: string, role: "worker" | "producer"): ConnectionOptions {
  return role === "worker"
    ? { url, family: 0, maxRetriesPerRequest: null }
    : { url, family: 0, maxRetriesPerRequest: 1, enableOfflineQueue: false };
}

/**
 * What the API needs from the queue. Only ids travel through Redis; the
 * worker reads everything else from Postgres.
 */
export type JobQueue = {
  enqueueRecording(processingJobId: string, run: number): Promise<void>;
  enqueueDocument(fileId: string, userId: string): Promise<void>;
  close(): Promise<void>;
};

/** Delays before each retry of a failed recording job: 30s, 2m, 8m. */
export const RETRY_DELAYS_MS = [30_000, 120_000, 480_000];

export function createJobQueue(redisUrl: string, prefix: string): JobQueue {
  const queue = new Queue<AiJobData, unknown, AiJobName>(AI_QUEUE, {
    connection: redisConnection(redisUrl, "producer"),
    prefix,
  });

  return {
    async enqueueRecording(processingJobId, run) {
      await queue.add(
        "recording.process",
        { kind: "recording.process", processingJobId },
        {
          // One queue entry per run: a user retry after a final failure is a
          // new entry, while enqueueing the same run twice is a no-op.
          jobId: `recording-${processingJobId}-${run}`,
          attempts: RETRY_DELAYS_MS.length + 1,
          backoff: { type: "lumina" },
          removeOnComplete: { age: 24 * 60 * 60 },
          removeOnFail: { age: 7 * 24 * 60 * 60 },
        },
      );
    },
    async enqueueDocument(fileId, userId) {
      await queue.add(
        "document.process",
        { kind: "document.process", fileId, userId },
        {
          // At most one entry per file while it's waiting or running; the
          // processor records its own errors on the file, so no retries.
          jobId: `document-${fileId}`,
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    },
    close: () => queue.close(),
  };
}
