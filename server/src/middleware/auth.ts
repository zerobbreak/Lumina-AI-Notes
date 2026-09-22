import type { RequestHandler, Response } from "express";
import { InvalidTokenError, type TokenVerifier, type VerifiedSession } from "../auth/verify-token.js";
import { HttpError } from "./errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      session?: VerifiedSession;
    }
  }
}

const BEARER = /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\s*$/i;

/**
 * Requires `Authorization: Bearer <Clerk session token>` (from `getToken()` on
 * the client) and verifies it: signature, expiry, not-before, and that it was
 * issued to one of our origins. The API is token-only; cookies are ignored.
 */
export function authenticate(verify: TokenVerifier): RequestHandler {
  return async (req, res, next) => {
    const header = req.header("authorization");
    if (!header) {
      res.set("WWW-Authenticate", 'Bearer realm="lumina"');
      throw new HttpError(401, "Sign in required", "unauthenticated");
    }

    const token = BEARER.exec(header)?.[1];
    if (!token) {
      res.set("WWW-Authenticate", 'Bearer realm="lumina", error="invalid_request"');
      throw new HttpError(401, "Malformed Authorization header", "invalid_token");
    }

    try {
      res.locals.session = await verify(token);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        if (err.kind === "invalid") {
          // Worth seeing in logs: wrong origin, bad signature, other instance...
          console.warn(`Rejected session token: ${err.reason}`);
        }
        res.set(
          "WWW-Authenticate",
          `Bearer realm="lumina", error="invalid_token", error_description="${err.message}"`,
        );
        throw new HttpError(401, err.message, err.kind === "expired" ? "token_expired" : "invalid_token");
      }
      throw err;
    }
    next();
  };
}

/** The verified session. Only call behind `authenticate`. */
export function currentSession(res: Response): VerifiedSession {
  const session = res.locals.session;
  if (!session) {
    throw new HttpError(401, "Sign in required", "unauthenticated");
  }
  return session;
}
