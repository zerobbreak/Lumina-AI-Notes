import { createDb } from "../db/client.js";
import { loadEnv } from "../env.js";
import { createStorage } from "../storage/s3.js";
import type { WorkerContext } from "./context.js";

export function createWorkerContext(): { ctx: WorkerContext; pool: { end: () => Promise<void> } } {
  const env = loadEnv();
  const { db, pool } = createDb(env.DATABASE_URL);
  const storage = createStorage({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  });
  return { ctx: { db, storage }, pool };
}
