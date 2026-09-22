import { createWorkerContext } from "./workers/bootstrap.js";
import {
  listWorkerJobNames,
  runWorkerJob,
  workerJobs,
  type WorkerJobName,
} from "./workers/registry.js";

const { ctx, pool } = createWorkerContext();
const timers: NodeJS.Timeout[] = [];

async function runJob(name: WorkerJobName) {
  const started = Date.now();
  try {
    const result = await runWorkerJob(name, ctx);
    console.log(`[worker] ${name} ok (${Date.now() - started}ms)`, result);
  } catch (err) {
    console.error(`[worker] ${name} failed:`, err);
  }
}

function scheduleJob(name: WorkerJobName) {
  const job = workerJobs[name];
  void runJob(name);
  const timer = setInterval(() => void runJob(name), job.intervalMs);
  timers.push(timer);
}

console.log("[worker] scheduler started");
for (const name of listWorkerJobNames()) {
  scheduleJob(name);
  console.log(`[worker] scheduled ${name} every ${Math.round(workerJobs[name].intervalMs / 60_000)}m`);
}

function shutdown(signal: string) {
  console.log(`${signal} received, stopping worker`);
  for (const timer of timers) clearInterval(timer);
  pool
    .end()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
