import type { WorkerContext, WorkerJob, WorkerResult } from "./context.js";

export type JobStatus = {
  intervalMs: number;
  enabled: boolean;
  running: boolean;
  lastStartedAt: number | null;
  lastFinishedAt: number | null;
  lastOk: boolean | null;
  lastResult: WorkerResult | null;
  lastError: string | null;
};

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

/**
 * Runs each job now and then every intervalMs, in this process. A job still
 * running when its next turn comes is skipped rather than started twice, and
 * one job failing never stops the others. Run a single replica: two would
 * each run every job.
 */
export function createScheduler(
  jobs: Record<string, WorkerJob>,
  ctx: WorkerContext,
  options: { disabled?: Set<string>; log?: Pick<Console, "log" | "error"> } = {},
) {
  const disabled = options.disabled ?? new Set<string>();
  const log = options.log ?? console;
  const timers: NodeJS.Timeout[] = [];
  const status: Record<string, JobStatus> = {};

  for (const [name, job] of Object.entries(jobs)) {
    status[name] = {
      intervalMs: job.intervalMs,
      enabled: !disabled.has(name),
      running: false,
      lastStartedAt: null,
      lastFinishedAt: null,
      lastOk: null,
      lastResult: null,
      lastError: null,
    };
  }

  async function run(name: string) {
    const entry = status[name];
    if (entry.running) {
      log.log(`[worker] ${name} still running from its last turn; skipping`);
      return;
    }
    entry.running = true;
    entry.lastStartedAt = Date.now();
    try {
      entry.lastResult = await jobs[name].run(ctx);
      entry.lastOk = true;
      entry.lastError = null;
      log.log(`[worker] ${name} ok (${Date.now() - entry.lastStartedAt}ms)`, entry.lastResult);
    } catch (err) {
      entry.lastOk = false;
      entry.lastError = err instanceof Error ? err.message : String(err);
      log.error(`[worker] ${name} failed:`, err);
    } finally {
      entry.running = false;
      entry.lastFinishedAt = Date.now();
    }
  }

  return {
    status,
    /** Settles once every enabled job's first run has finished. */
    start(): Promise<void> {
      const firstRuns: Promise<void>[] = [];
      for (const [name, job] of Object.entries(jobs)) {
        if (disabled.has(name)) {
          log.log(`[worker] ${name} disabled`);
          continue;
        }
        firstRuns.push(run(name));
        timers.push(setInterval(() => void run(name), job.intervalMs));
        log.log(`[worker] scheduled ${name} every ${Math.round(job.intervalMs / 60_000)}m`);
      }
      return Promise.all(firstRuns).then(() => undefined);
    },
    stop() {
      for (const timer of timers) clearInterval(timer);
      timers.length = 0;
    },
  };
}
