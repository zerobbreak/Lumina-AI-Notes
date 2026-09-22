import { z } from "zod";

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
  CLERK_JWT_KEY: z
    .string()
    .transform((pem) => pem.replace(/\\n/g, "\n").trim())
    .pipe(z.string().startsWith("-----BEGIN PUBLIC KEY-----"))
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
