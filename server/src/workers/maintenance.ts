import { Queue, UnrecoverableError, Worker } from "bullmq";
import type { Env } from "../env.js";
import { MAINTENANCE_QUEUE, redisConnection } from "../queue/queues.js";
import type { WorkerContext, WorkerJob } from "./context.js";

/**
 * "a, b" -> {"a","b"}; names that aren't jobs are an error, so a typo in the
 * Railway variable can't silently leave a job running that was meant to be off.
 */
export function parseDisabledJobs(value: string | undefined, known: string[]): Set<string> {
  const names = (value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const unknown = names.filter((name) => !known.includes(name));
  if (unknown.length > 0) {
    throw new Error(`WORKER_DISABLED_JOBS names unknown jobs: ${unknown.join(", ")} (known: ${known.join(", ")})`);
  }
  return new Set(names);
}

type SchedulerQueue = Pick<Queue, "upsertJobScheduler" | "removeJobScheduler">;

/**
 * One BullMQ job scheduler per enabled job, every intervalMs. Schedulers live
 * in Redis, so however many worker replicas call this, each run happens once.
 * A disabled job's scheduler is removed, so turning a job off takes effect
 * on the next deploy rather than lingering in Redis.
 */
export async function syncSchedulers(
  queue: SchedulerQueue,
  jobs: Record<string, WorkerJob>,
  disabled: Set<string>,
  log: Pick<Console, "log"> = console,
) {
  for (const [name, job] of Object.entries(jobs)) {
    if (disabled.has(name)) {
      await queue.removeJobScheduler(name);
      log.log(`[maintenance] ${name} disabled`);
      continue;
    }
    await queue.upsertJobScheduler(
      name,
      { every: job.intervalMs },
      { name, opts: { removeOnComplete: 50, removeOnFail: 50 } },
    );
    log.log(`[maintenance] scheduled ${name} every ${Math.round(job.intervalMs / 60_000)}m`);
  }
}

export async function startMaintenance(
  ctx: WorkerContext,
  env: Env,
  jobs: Record<string, WorkerJob>,
  disabled: Set<string>,
) {
  const queue = new Queue(MAINTENANCE_QUEUE, { connection: redisConnection(env.REDIS_URL, "worker"), prefix: env.QUEUE_PREFIX });
  await syncSchedulers(queue, jobs, disabled);

  const worker = new Worker(
    MAINTENANCE_QUEUE,
    async (job) => {
      const entry = jobs[job.name];
      if (!entry) throw new UnrecoverableError(`Unknown maintenance job: ${job.name}`);
      // A scheduler left behind by an older deploy with different settings.
      if (disabled.has(job.name)) return { skipped: true };
      const started = Date.now();
      const result = await entry.run(ctx);
      console.log(`[maintenance] ${job.name} ok (${Date.now() - started}ms)`, result);
      return result;
    },
    // One at a time per replica: these are cheap but touch every user's rows.
    { connection: redisConnection(env.REDIS_URL, "worker"), prefix: env.QUEUE_PREFIX, concurrency: 1 },
  );
  worker.on("failed", (job, error) => console.error(`[maintenance] ${job?.name} failed:`, error));
  worker.on("error", (error) => console.error("[maintenance] error:", error));
  return { queue, worker };
}
