import { createPublicKey } from "node:crypto";
import { z } from "zod";

function isPublicKey(pem: string) {
  if (!pem.startsWith("-----BEGIN PUBLIC KEY-----")) return false;
  try {
    createPublicKey(pem);
    return true;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  // On Railway, reference ${{Postgres.DATABASE_URL}} (private network).
  // Locally, use the Postgres service's public URL.
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  // PEM public key (Clerk dashboard -> API keys -> Show JWT public key).
  // Set it to verify tokens without calling Clerk. Newlines may be written as
  // a literal \n so the key fits on one line in .env or Railway variables.
  // Must be one line in .env: Node's env-file parser keeps only the first line
  // of an unquoted multi-line value, which left just the BEGIN marker and made
  // every real token fail with token-invalid-signature.
  CLERK_JWT_KEY: z
    .string()
    .transform((pem) => pem.replace(/\\n/g, "\n").trim())
    .refine(isPublicKey, {
      message: "Not a valid PEM public key. In .env, write it on one line with \\n for newlines",
    })
    .optional(),
  // Origins allowed to have issued a session token (its azp claim).
  // Defaults to CORS_ORIGINS, minus "null" (Electron gets its token from the website).
  CLERK_AUTHORIZED_PARTIES: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .optional(),

  // Railway bucket: `railway bucket credentials --bucket lumina-uploads`
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),

  // How many bytes one user may upload per UTC day, across all uploads.
  UPLOAD_BYTES_PER_DAY: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024 * 1024),

  // Gemini API key for /api/v1/ai/*. Optional so the rest of the app still
  // boots without it; a route that needs it fails loudly at call time
  // instead (same as Convex's own `getGeminiModel` check).
  GEMINI_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),

  // Job queue (BullMQ). On Railway, reference ${{Redis.REDIS_URL}} (private
  // network); locally, the Redis service's public URL.
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  // Namespaces every queue key, so a laptop pointed at the Railway Redis
  // can't pick up production jobs. Required so nobody forgets to set it.
  QUEUE_PREFIX: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]*$/i, "letters, digits, _ and - only, e.g. prod or dev-alice"),
  // How many AI jobs one worker replica runs at once, and how many it may
  // start per minute across them (keeps free-tier Gemini/ElevenLabs happy).
  AI_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  AI_WORKER_RATE_PER_MIN: z.coerce.number().int().min(1).max(1000).default(10),
});

export type Env = Omit<z.infer<typeof envSchema>, "CLERK_AUTHORIZED_PARTIES"> & {
  CLERK_AUTHORIZED_PARTIES: string[];
};

/**
 * Parses and validates process env. Throws with every problem listed at once,
 * so a misconfigured Railway deploy fails at boot rather than on first request.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${problems}`);
  }
  const env = result.data;
  return {
    ...env,
    CLERK_AUTHORIZED_PARTIES:
      env.CLERK_AUTHORIZED_PARTIES ?? env.CORS_ORIGINS.filter((origin) => origin !== "null"),
  };
}
