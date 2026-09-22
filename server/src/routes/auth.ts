import { eq } from "drizzle-orm";
import { Router } from "express";
import type { ClerkProfiles } from "../auth/clerk-profiles.js";
import type { Db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { currentSession } from "../middleware/auth.js";
import { currentUser } from "../middleware/user.js";

/**
 * Session endpoints. Both run behind `authenticate` + `loadUser`, so reaching
 * the handler already means the Clerk token verified and the user row exists.
 */
export function createAuthRouter(db: Db, profiles: ClerkProfiles) {
  const router = Router();

  /**
   * Call after sign-in and on app start: confirms the token is accepted and
   * returns who the API thinks the caller is. Creates the user on first call.
   */
  router.get("/session", (_req, res) => {
    const session = currentSession(res);
    res.json({
      session: {
        clerkUserId: session.clerkUserId,
        sessionId: session.sessionId,
        authorizedParty: session.authorizedParty,
        expiresAt: session.expiresAt,
      },
      user: currentUser(res),
    });
  });

  /**
   * Replaces Convex's createOrUpdateUser. Re-reads email/name/avatar from
   * Clerk (the source of truth) rather than trusting values from the client;
   * call it after the user edits their Clerk profile.
   */
  router.post("/sync", async (_req, res) => {
    const user = currentUser(res);
    const profile = await profiles.get(user.clerkUserId);
    const [updated] = await db.update(users).set(profile).where(eq(users.id, user.id)).returning();
    res.json(updated);
  });

  return router;
}
