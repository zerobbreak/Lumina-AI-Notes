import { describe, expect, it, vi } from "vitest";
import type { WorkerJob } from "../src/workers/context.js";
import { parseDisabledJobs, syncSchedulers } from "../src/workers/maintenance.js";
import { listWorkerJobNames } from "../src/workers/registry.js";

const quiet = { log: () => {} };
const job = (intervalMs: number): WorkerJob => ({ description: "test", intervalMs, run: async () => ({}) });

function fakeSchedulerQueue() {
  return {
    upsertJobScheduler: vi.fn(async () => ({}) as never),
    removeJobScheduler: vi.fn(async () => true),
  };
}

describe("syncSchedulers", () => {
  it("schedules every enabled job on its interval, keyed by name so replicas share one schedule", async () => {
    const queue = fakeSchedulerQueue();
    await syncSchedulers(queue, { reminders: job(600_000), streaks: job(86_400_000) }, new Set(), quiet);
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      "reminders",
      { every: 600_000 },
      expect.objectContaining({ name: "reminders" }),
    );
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      "streaks",
      { every: 86_400_000 },
      expect.objectContaining({ name: "streaks" }),
    );
    expect(queue.removeJobScheduler).not.toHaveBeenCalled();
  });

  it("removes a disabled job's schedule instead of leaving it in Redis", async () => {
    const queue = fakeSchedulerQueue();
    await syncSchedulers(queue, { "cleanup-stale": job(60_000), other: job(60_000) }, new Set(["cleanup-stale"]), quiet);
    expect(queue.removeJobScheduler).toHaveBeenCalledWith("cleanup-stale");
    expect(queue.upsertJobScheduler).toHaveBeenCalledTimes(1);
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith("other", expect.anything(), expect.anything());
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
