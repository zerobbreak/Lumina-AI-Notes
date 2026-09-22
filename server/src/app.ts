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

  app.use("/api/v1", createApiRouter(deps));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
