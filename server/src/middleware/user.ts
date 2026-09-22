import { eq } from "drizzle-orm";
import type { RequestHandler, Response } from "express";
import type { ClerkProfiles } from "../auth/clerk-profiles.js";
import type { Db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { userIdOf } from "./auth.js";
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
 * Resolves the signed-in Clerk user to their `users` row, creating it on first
 * request (Convex did this in users.store). Runs behind `requireUser`.
 */
export function loadUser(db: Db, profiles: ClerkProfiles): RequestHandler {
  return async (req, res, next) => {
    const clerkUserId = userIdOf(req);

    let [user] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
    if (!user) {
      const profile = await profiles.get(clerkUserId);
      // Two first requests can race; the unique clerk_user_id makes this idempotent.
      [user] = await db
        .insert(users)
        .values({ clerkUserId, ...profile })
        .onConflictDoUpdate({ target: users.clerkUserId, set: { email: profile.email } })
        .returning();
    }

    res.locals.user = user;
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
