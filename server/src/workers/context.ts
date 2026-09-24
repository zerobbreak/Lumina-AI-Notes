import type { Db } from "../db/client.js";
import type { SecretBox } from "../integrations/secretBox.js";
import type { Storage } from "../storage/s3.js";

export type WorkerContext = {
  db: Db;
  storage: Storage;
  /** Opens stored LMS credentials; absent when LMS_ENCRYPTION_KEY isn't set. */
  lmsBox?: SecretBox;
};

export type WorkerResult = Record<string, number | string | boolean | null>;

export type WorkerJob = {
  /** Human-readable name for logs. */
  description: string;
  /** How often it runs, via a BullMQ job scheduler (workers/maintenance.ts). */
  intervalMs: number;
  run: (ctx: WorkerContext) => Promise<WorkerResult>;
};
