import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { ClerkProfiles } from "./auth/clerk-profiles.js";
import type { TokenVerifier } from "./auth/verify-token.js";
import type { Db } from "./db/client.js";
import type { Env } from "./env.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { createApiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.js";
import { createPublicRouter } from "./routes/public.js";
import type { Storage } from "./storage/s3.js";

/** Everything routes need, built once in index.ts (or faked in tests). */
export type AppDeps = {
  env: Env;
  db: Db;
  storage: Storage;
  clerkProfiles: ClerkProfiles;
  verifyToken: TokenVerifier;
};

export function createApp(deps: AppDeps) {
  const { env } = deps;
  const app = express();

  // Railway terminates TLS at its proxy; trust it so req.ip/req.protocol are real.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  // Dates go out as ms timestamps, as Convex sent them, so client code like
  // `Date.now() - note.createdAt` keeps working. Date#toJSON runs before the
  // replacer, so read the original value off the holder object.
  app.set("json replacer", function (this: Record<string, unknown>, key: string, value: unknown) {
    const raw = this[key];
    return raw instanceof Date ? raw.getTime() : value;
  });

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      allowedHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );
  // Notes send their whole HTML on every save, and JSON escaping makes that
  // 10-20% bigger than the note. Their own limits are checked per field.
  // This runs first, so the general parser below sees the body already read.
  app.use("/api/v1/notes", express.json({ limit: "5mb" }));
  // Formula extraction carries an inline base64 image, bigger than any other
  // AI payload; must be registered before the blanket /api/v1/ai limit below
  // (body-parser skips a body it already parsed, so order picks the winner).
  app.use("/api/v1/ai/extract-formula-from-image", express.json({ limit: "10mb" }));
  // Transcript/generation AI routes carry a full lecture transcript; the
  // tighter per-field caps for short text-op routes are enforced by zod.
  app.use("/api/v1/ai", express.json({ limit: "1mb" }));
  // Files go straight to the bucket via presigned URLs, so JSON stays small.
  app.use(express.json({ limit: "1mb" }));

  if (env.NODE_ENV !== "test") {
    app.use((req, res, next) => {
      const start = performance.now();
      res.on("finish", () => {
        const ms = (performance.now() - start).toFixed(1);
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
      });
      next();
    });
  }

  app.use("/health", healthRouter);

  // No sign-in needed; must come before the authenticated router.
  app.use("/api/v1/public", createPublicRouter(deps.db));
  app.use("/api/v1", createApiRouter(deps));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
