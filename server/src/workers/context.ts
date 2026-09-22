import type { Db } from "../db/client.js";
import type { Storage } from "../storage/s3.js";

export type WorkerContext = {
  db: Db;
  storage: Storage;
};

export type WorkerResult = Record<string, number | string | boolean | null>;

export type WorkerJob = {
  /** Human-readable name for logs. */
  description: string;
  /** How often Convex ran this job; used by the in-process scheduler. */
  intervalMs: number;
  run: (ctx: WorkerContext) => Promise<WorkerResult>;
};
