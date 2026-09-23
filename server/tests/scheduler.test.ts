import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkerContext, WorkerJob } from "../src/workers/context.js";
import { listWorkerJobNames } from "../src/workers/registry.js";
import { createScheduler, parseDisabledJobs } from "../src/workers/scheduler.js";

const ctx = {} as WorkerContext;
const quiet = { log: () => {}, error: () => {} };
const MINUTE = 60_000;

const job = (intervalMs: number, run: WorkerJob["run"]): WorkerJob => ({ description: "test", intervalMs, run });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createScheduler", () => {
  it("runs each job at once and then on its interval", async () => {
    const run = vi.fn(async () => ({ sent: 1 }));
    const scheduler = createScheduler({ reminders: job(10 * MINUTE, run) }, ctx, { log: quiet });
    await scheduler.start();
    expect(run).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30 * MINUTE);
    expect(run).toHaveBeenCalledTimes(4);
    expect(scheduler.status.reminders).toMatchObject({ lastOk: true, lastResult: { sent: 1 }, running: false });
    scheduler.stop();
  });

  it("never runs a disabled job, even at startup", async () => {
    const cleanup = vi.fn(async () => ({ deletedNotes: 99 }));
    const other = vi.fn(async () => ({}));
    const scheduler = createScheduler(
      { "cleanup-stale": job(MINUTE, cleanup), other: job(MINUTE, other) },
      ctx,
      { disabled: new Set(["cleanup-stale"]), log: quiet },
    );
    await scheduler.start();
    await vi.advanceTimersByTimeAsync(10 * MINUTE);
    expect(cleanup).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalled();
    expect(scheduler.status["cleanup-stale"].enabled).toBe(false);
    scheduler.stop();
  });

  it("skips a turn rather than overlapping a run that's still going", async () => {
    let finish!: () => void;
    const run = vi.fn(() => new Promise<Record<string, number>>((resolve) => (finish = () => resolve({}))));
    const scheduler = createScheduler({ slow: job(MINUTE, run) }, ctx, { log: quiet });
    void scheduler.start();

    await vi.advanceTimersByTimeAsync(5 * MINUTE);
    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduler.status.slow.running).toBe(true);

    finish();
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("keeps going after a job fails, and records the failure", async () => {
    const failing = vi.fn(async () => {
      throw new Error("database unavailable");
    });
    const healthy = vi.fn(async () => ({}));
    const scheduler = createScheduler({ failing: job(MINUTE, failing), healthy: job(MINUTE, healthy) }, ctx, {
      log: quiet,
    });
    await scheduler.start();
    await vi.advanceTimersByTimeAsync(2 * MINUTE);
    expect(failing).toHaveBeenCalledTimes(3);
    expect(healthy).toHaveBeenCalledTimes(3);
    expect(scheduler.status.failing).toMatchObject({ lastOk: false, lastError: "database unavailable" });
    scheduler.stop();
  });

  it("stops scheduling on stop()", async () => {
    const run = vi.fn(async () => ({}));
    const scheduler = createScheduler({ j: job(MINUTE, run) }, ctx, { log: quiet });
    await scheduler.start();
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(10 * MINUTE);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("parseDisabledJobs", () => {
  const known = listWorkerJobNames();

  it("reads a comma-separated list of real job names", () => {
    expect(parseDisabledJobs(" cleanup-stale , streak-reset", known)).toEqual(new Set(["cleanup-stale", "streak-reset"]));
    expect(parseDisabledJobs(undefined, known)).toEqual(new Set());
    expect(parseDisabledJobs("", known)).toEqual(new Set());
  });

  it("refuses a typo instead of silently leaving the job on", () => {
    expect(() => parseDisabledJobs("cleanup-stail", known)).toThrow(/unknown jobs: cleanup-stail/);
  });
});
