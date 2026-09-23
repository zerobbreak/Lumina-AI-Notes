import { createServer } from "node:http";
import { Queue } from "bullmq";
import { loadEnv } from "./env.js";
import { AI_QUEUE, MAINTENANCE_QUEUE, redisConnection } from "./queue/queues.js";
import { startAiWorker } from "./workers/aiWorker.js";
import { createWorkerContext } from "./workers/bootstrap.js";
import { startMaintenance, parseDisabledJobs } from "./workers/maintenance.js";
import { listWorkerJobNames, workerJobs } from "./workers/registry.js";

const env = loadEnv();
const { ctx, pool } = createWorkerContext();
const disabled = parseDisabledJobs(process.env.WORKER_DISABLED_JOBS, listWorkerJobNames());

const aiWorker = startAiWorker(ctx, env);
const maintenance = await startMaintenance(ctx, env, workerJobs, disabled);
// Read-only handle for the health endpoint's counts.
const aiQueue = new Queue(AI_QUEUE, { connection: redisConnection(env.REDIS_URL, "worker"), prefix: env.QUEUE_PREFIX });
console.log(
  `[worker] consuming "${AI_QUEUE}" (concurrency ${env.AI_WORKER_CONCURRENCY}, ${env.AI_WORKER_RATE_PER_MIN}/min) and "${MAINTENANCE_QUEUE}" with prefix "${env.QUEUE_PREFIX}"`,
);

// Railway's healthcheck (railway.json) hits /health on PORT. It also shows
// how much work is queued; nothing here is secret.
const port = Number(process.env.PORT);
const server = port
  ? createServer((req, res) => {
      if (req.url !== "/health") {
        res.writeHead(404).end();
        return;
      }
      Promise.all([
        aiQueue.getJobCounts("waiting", "active", "delayed", "failed", "completed"),
        maintenance.queue.getJobCounts("waiting", "active", "delayed", "failed"),
      ])
        .then(([ai, maint]) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", role: "worker", queues: { [AI_QUEUE]: ai, [MAINTENANCE_QUEUE]: maint } }));
        })
        .catch((err: unknown) => {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "redis_unavailable", error: String(err) }));
        });
    }).listen(port, () => console.log(`[worker] health on :${port}`))
  : null;

/**
 * Lets running jobs finish before exiting. One that can't finish in time is
 * picked up again by another worker (BullMQ's stalled-job check) and resumes
 * from its last checkpoint.
 */
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, stopping worker`);
  setTimeout(() => process.exit(1), 30_000).unref();
  server?.close();
  try {
    await Promise.all([aiWorker.close(), maintenance.worker.close()]);
    await Promise.all([aiQueue.close(), maintenance.queue.close(), pool.end()]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
