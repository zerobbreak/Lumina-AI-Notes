import { Router } from "express";
import type { AppDeps } from "../app.js";
import { requireUser } from "../middleware/auth.js";
import { currentUser, loadUser } from "../middleware/user.js";
import { createUploadsRouter } from "./uploads.js";

/**
 * Everything under /api/v1 requires a signed-in user, resolved to their
 * `users` row. Mount one router per Convex module here as each is ported.
 */
export function createApiRouter({ env, db, storage, clerkProfiles }: AppDeps) {
  const router = Router();

  router.use(requireUser, loadUser(db, clerkProfiles));

  router.get("/me", (_req, res) => {
    res.json(currentUser(res));
  });

  router.use("/uploads", createUploadsRouter(storage, env.MAX_UPLOAD_BYTES));

  return router;
}
