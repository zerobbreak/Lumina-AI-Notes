import { createWorkerContext } from "./bootstrap.js";
import { listWorkerJobNames, runWorkerJob, workerJobs, type WorkerJobName } from "./registry.js";

function isWorkerJobName(name: string): name is WorkerJobName {
  return name in workerJobs;
}

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === "--help" || arg === "-h") {
    console.log("Usage: npm run worker -- <job-name>\n");
    console.log("Jobs:");
    for (const name of listWorkerJobNames()) {
      const job = workerJobs[name];
      console.log(`  ${name} — ${job.description} (every ${Math.round(job.intervalMs / 60_000)}m)`);
    }
    process.exit(arg ? 0 : 1);
  }

  if (!isWorkerJobName(arg)) {
    console.error(`Unknown job: ${arg}`);
    console.error(`Available: ${listWorkerJobNames().join(", ")}`);
    process.exit(1);
  }

  const { ctx, pool } = createWorkerContext();
  const started = Date.now();

  try {
    console.log(`[worker] running ${arg}…`);
    const result = await runWorkerJob(arg, ctx);
    console.log(`[worker] ${arg} finished in ${Date.now() - started}ms`, result);
    process.exit(0);
  } catch (err) {
    console.error(`[worker] ${arg} failed:`, err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
