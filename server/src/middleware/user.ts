import { eq } from "drizzle-orm";
import type { RequestHandler, Response } from "express";
import type { ClerkProfiles } from "../auth/clerk-profiles.js";
import type { Db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { currentSession } from "./auth.js";
import { HttpError } from "./errors.js";

export type User = typeof users.$inferSelect;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user?: User;
    }
  }
}

/**
 * Starting values Convex's createOrUpdateUser gave every new user, minus the
 * gamification fields (streaks, badges, goals), which are being removed.
 */
export const NEW_USER_DEFAULTS = {
  onboardingComplete: false,
  courses: [],
  tourCompleted: false,
  tourStep: 0,
} satisfies Partial<typeof users.$inferInsert>;

/**
 * Finds the caller's `users` row, creating it from their Clerk profile on
 * first sight. Safe under concurrent first requests (unique clerk_user_id).
 */
export async function findOrCreateUser(
  db: Db,
  profiles: ClerkProfiles,
  clerkUserId: string,
): Promise<User> {
  const [existing] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing) return existing;

  const profile = await profiles.get(clerkUserId);
  const [created] = await db
    .insert(users)
    .values({ clerkUserId, ...profile, ...NEW_USER_DEFAULTS })
    // Lost a race with another first request: keep the winner's row as-is.
    .onConflictDoUpdate({ target: users.clerkUserId, set: { clerkUserId } })
    .returning();
  return created;
}

/** Resolves the verified session to a `users` row. Runs behind `authenticate`. */
export function loadUser(db: Db, profiles: ClerkProfiles): RequestHandler {
  return async (_req, res, next) => {
    res.locals.user = await findOrCreateUser(db, profiles, currentSession(res).clerkUserId);
    next();
  };
}

/** The signed-in user's row. Only call behind `loadUser`. */
export function currentUser(res: Response): User {
  const user = res.locals.user;
  if (!user) {
    throw new HttpError(401, "Sign in required", "unauthenticated");
  }
  return user;
}
