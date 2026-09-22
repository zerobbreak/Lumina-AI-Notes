import { Router } from "express";
import type { AppDeps } from "../app.js";
import { authenticate } from "../middleware/auth.js";
import { loadUser } from "../middleware/user.js";
import { createAiRouter } from "./ai.js";
import { createAuthRouter } from "./auth.js";
import { createCollaborationRouter } from "./collaboration.js";
import { createCoursesRouter } from "./courses.js";
import { createFilesRouter } from "./files.js";
import { createFlashcardsRouter } from "./flashcards.js";
import { createNoteListsRouter } from "./note-lists.js";
import { createNotesRouter } from "./notes.js";
import { createPresenceRouter } from "./presence.js";
import { createQuizzesRouter } from "./quizzes.js";
import { createRecordingsRouter } from "./recordings.js";
import { createSearchRouter } from "./search.js";
import { createTagsRouter } from "./tags.js";
import { createUploadsRouter } from "./uploads.js";
import { createUsersRouter } from "./users.js";

/**
 * Everything under /api/v1 needs a verified Clerk session token, resolved to
 * the caller's `users` row. Mount one router per Convex module as it's ported.
 */
export function createApiRouter({ env, db, storage, clerkProfiles, verifyToken }: AppDeps) {
  const router = Router();

  router.use(authenticate(verifyToken), loadUser(db, clerkProfiles));

  router.use("/auth", createAuthRouter(db, clerkProfiles));
  router.use("/uploads", createUploadsRouter(storage, env.MAX_UPLOAD_BYTES));
  router.use("/files", createFilesRouter(db, storage, env.GEMINI_API_KEY));
  router.use("/flashcards", createFlashcardsRouter(db));
  router.use("/quizzes", createQuizzesRouter(db));
  router.use("/recordings", createRecordingsRouter(db, storage));
  router.use("/search", createSearchRouter(db, storage, env.GEMINI_API_KEY));
  router.use("/users", createUsersRouter(db));
  router.use("/courses", createCoursesRouter(db, storage));
  // Lists first, so /notes/quick etc. aren't read as a note id.
  router.use(
    "/notes",
    createNoteListsRouter(db),
    createCollaborationRouter(db),
    createPresenceRouter(db),
    createNotesRouter(db),
  );
  router.use("/tags", createTagsRouter(db));
  router.use("/ai", createAiRouter(db, env, storage));

  return router;
}
