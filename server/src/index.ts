import { createApp } from "./app.js";
import { createClerkProfiles } from "./auth/clerk-profiles.js";
import { createTokenVerifier } from "./auth/verify-token.js";
import { createDb } from "./db/client.js";
import { loadEnv } from "./env.js";
import { createJobQueue } from "./queue/queues.js";
import { createStorage } from "./storage/s3.js";

const env = loadEnv();
const { db, pool } = createDb(env.DATABASE_URL);
const storage = createStorage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
});
const clerkProfiles = createClerkProfiles(env.CLERK_SECRET_KEY);
const verifyToken = createTokenVerifier({
  jwtKey: env.CLERK_JWT_KEY,
  secretKey: env.CLERK_SECRET_KEY,
  authorizedParties: env.CLERK_AUTHORIZED_PARTIES,
});
if (!env.CLERK_JWT_KEY) {
  console.warn("CLERK_JWT_KEY is not set; verifying tokens via Clerk's JWKS endpoint");
}
const queue = createJobQueue(env.REDIS_URL, env.QUEUE_PREFIX);
const app = createApp({ env, db, storage, clerkProfiles, verifyToken, queue });

const server = app.listen(env.PORT, () => {
  console.log(`Lumina API listening on :${env.PORT} (${env.NODE_ENV})`);
});

// Railway sends SIGTERM on redeploy; finish in-flight requests before exiting.
function shutdown(signal: string) {
  console.log(`${signal} received, closing server`);
  server.close((err) => {
    Promise.allSettled([pool.end(), queue.close()]).finally(() => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
