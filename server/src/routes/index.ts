import { Router } from "express";
import type { AppDeps } from "../app.js";
import { authenticate } from "../middleware/auth.js";
import { loadUser } from "../middleware/user.js";
import { createAccountRouter } from "./account.js";
import { createAiRouter } from "./ai.js";
import { createAnnouncementsRouter } from "./announcements.js";
import { createAnalyticsRouter } from "./analytics.js";
import { createAuthRouter } from "./auth.js";
import { createCalendarRouter } from "./calendar.js";
import { createChatsRouter } from "./chats.js";
import { createCollaborationRouter } from "./collaboration.js";
import { createDeadlinesRouter } from "./deadlines.js";
import { createCoursesRouter } from "./courses.js";
import { createFilesRouter } from "./files.js";
import { createFlashcardsRouter } from "./flashcards.js";
import { createJobsRouter } from "./jobs.js";
import { createKnowledgeGraphRouter } from "./knowledgeGraph.js";
import { createNoteListsRouter } from "./note-lists.js";
import { createNotesRouter } from "./notes.js";
import { createNotificationsRouter } from "./notifications.js";
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
export function createApiRouter({ env, db, storage, clerkProfiles, verifyToken, queue }: AppDeps) {
  const router = Router();

  router.use(authenticate(verifyToken), loadUser(db, clerkProfiles));

  router.use("/analytics", createAnalyticsRouter(db));
  router.use("/announcements", createAnnouncementsRouter(db));
  router.use("/auth", createAuthRouter(db, clerkProfiles));
  router.use("/uploads", createUploadsRouter(db, storage, {
      maxUploadBytes: env.MAX_UPLOAD_BYTES,
      maxBytesPerDay: env.UPLOAD_BYTES_PER_DAY,
    }));
  router.use("/files", createFilesRouter(db, storage, queue));
  router.use("/flashcards", createFlashcardsRouter(db));
  router.use("/jobs", createJobsRouter(db, queue));
  router.use("/knowledge-graph", createKnowledgeGraphRouter(db));
  router.use("/quizzes", createQuizzesRouter(db));
  router.use("/recordings", createRecordingsRouter(db, storage, queue));
  router.use("/search", createSearchRouter(db, storage, env.GEMINI_API_KEY));
  router.use("/users", createUsersRouter(db));
  router.use("/users", createAccountRouter(db, storage, clerkProfiles));
  router.use("/calendar", createCalendarRouter(db));
  router.use("/chats", createChatsRouter(db, env.GEMINI_API_KEY));
  router.use("/courses", createCoursesRouter(db, storage));
  router.use("/deadlines", createDeadlinesRouter(db));
  router.use("/notifications", createNotificationsRouter(db));
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
