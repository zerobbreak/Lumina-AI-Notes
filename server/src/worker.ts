import { createServer } from "node:http";
import { createWorkerContext } from "./workers/bootstrap.js";
import { listWorkerJobNames, workerJobs } from "./workers/registry.js";
import { createScheduler, parseDisabledJobs } from "./workers/scheduler.js";

const { ctx, pool } = createWorkerContext();
const scheduler = createScheduler(workerJobs, ctx, {
  disabled: parseDisabledJobs(process.env.WORKER_DISABLED_JOBS, listWorkerJobNames()),
});

console.log("[worker] scheduler started");
void scheduler.start();

// Railway's healthcheck (railway.json) hits /health on PORT. It also shows
// when each job last ran and how it went; nothing here is secret.
const port = Number(process.env.PORT);
const server = port
  ? createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", role: "worker", jobs: scheduler.status }));
        return;
      }
      res.writeHead(404).end();
    }).listen(port, () => console.log(`[worker] health on :${port}`))
  : null;

function shutdown(signal: string) {
  console.log(`${signal} received, stopping worker`);
  scheduler.stop();
  server?.close();
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
