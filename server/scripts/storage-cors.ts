/**
 * Lets browsers PUT/GET the Railway bucket directly from the app's origins.
 * Re-run whenever CORS_ORIGINS changes (e.g. adding the production domain).
 *
 *   npm run storage:cors
 */
import { GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { loadEnv } from "../src/env.js";
import { createStorage } from "../src/storage/s3.js";

try {
  process.loadEnvFile(".env");
} catch {
  // Fall back to the real environment.
}
const env = loadEnv();
const storage = createStorage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
});

await storage.client.send(
  new PutBucketCorsCommand({
    Bucket: storage.bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: env.CORS_ORIGINS,
          // PUT for uploads; GET/HEAD so pdf.js, <audio> and fetch() can read files.
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedHeaders: ["content-type", "range"],
          ExposeHeaders: ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const current = await storage.client.send(new GetBucketCorsCommand({ Bucket: storage.bucket }));
console.log("Bucket CORS rules now:", JSON.stringify(current.CORSRules, null, 2));
