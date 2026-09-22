import { Router } from "express";
import type { AppDeps } from "../app.js";
import { authenticate } from "../middleware/auth.js";
import { loadUser } from "../middleware/user.js";
import { createAuthRouter } from "./auth.js";
import { createFilesRouter } from "./files.js";
import { createUploadsRouter } from "./uploads.js";

/**
 * Everything under /api/v1 needs a verified Clerk session token, resolved to
 * the caller's `users` row. Mount one router per Convex module as it's ported.
 */
export function createApiRouter({ env, db, storage, clerkProfiles, verifyToken }: AppDeps) {
  const router = Router();

  router.use(authenticate(verifyToken), loadUser(db, clerkProfiles));

  router.use("/auth", createAuthRouter(db, clerkProfiles));
  router.use("/uploads", createUploadsRouter(storage, env.MAX_UPLOAD_BYTES));
  router.use("/files", createFilesRouter(db, storage));

  return router;
}
