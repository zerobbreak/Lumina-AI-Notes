import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { HttpError } from "./errors.js";

/**
 * Rejects requests without a valid Clerk session token with a JSON 401.
 * Clerk's own `requireAuth()` redirects to sign-in, which suits pages, not an API.
 * Clients send the token as `Authorization: Bearer <token>` from `getToken()`.
 */
export const requireUser: RequestHandler = (req, _res, next) => {
  if (!getAuth(req).userId) {
    next(new HttpError(401, "Sign in required", "unauthenticated"));
    return;
  }
  next();
};

/** The signed-in Clerk user id. Only call behind `requireUser`. */
export function userIdOf(req: Request): string {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new HttpError(401, "Sign in required", "unauthenticated");
  }
  return userId;
}
