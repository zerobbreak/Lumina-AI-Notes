import { verifyToken } from "@clerk/backend";
import { TokenVerificationError, TokenVerificationErrorReason } from "@clerk/backend/errors";

export type VerifierConfig = {
  /** PEM public key from Clerk (API keys -> Show JWT public key). Verifies without network calls. */
  jwtKey?: string;
  /** Fallback: fetch and cache Clerk's JWKS with the secret key. */
  secretKey: string;
  /**
   * Origins allowed to have minted the token (its `azp` claim). A token issued
   * to any other site is rejected, as is one with no `azp` at all.
   */
  authorizedParties: string[];
};

/** What the rest of the API knows about a verified caller. */
export type VerifiedSession = {
  clerkUserId: string;
  sessionId: string | null;
  /** Origin the token was issued to */
  authorizedParty: string | null;
  expiresAt: Date;
};

/**
 * Why a token was refused. `expired` tells the client to fetch a fresh token
 * (Clerk session tokens live ~60s) and retry; `invalid` means sign in again.
 */
export class InvalidTokenError extends Error {
  constructor(
    readonly kind: "expired" | "invalid",
    /** Clerk's reason code, for logs only; never sent to clients. */
    readonly reason: string,
  ) {
    super(kind === "expired" ? "Session token expired" : "Invalid session token");
    this.name = "InvalidTokenError";
  }
}

export type TokenVerifier = (token: string) => Promise<VerifiedSession>;

/**
 * Failures caused by our configuration or Clerk being unreachable. Reporting
 * these as 401 would make every client sign out during an outage.
 */
const SERVER_SIDE_REASONS = new Set<string>([
  TokenVerificationErrorReason.InvalidSecretKey,
  TokenVerificationErrorReason.LocalJWKMissing,
  TokenVerificationErrorReason.RemoteJWKFailedToLoad,
  TokenVerificationErrorReason.RemoteJWKInvalid,
  TokenVerificationErrorReason.JWKFailedToResolve,
]);

export function createTokenVerifier(config: VerifierConfig): TokenVerifier {
  if (config.authorizedParties.length === 0) {
    // Without this, a token minted for any site on the same Clerk instance would pass.
    throw new Error("createTokenVerifier needs at least one authorized party");
  }

  return async (token) => {
    let claims: Awaited<ReturnType<typeof verifyToken>>;
    try {
      claims = await verifyToken(token, {
        jwtKey: config.jwtKey,
        secretKey: config.jwtKey ? undefined : config.secretKey,
        authorizedParties: config.authorizedParties,
      });
    } catch (err) {
      if (err instanceof TokenVerificationError && !SERVER_SIDE_REASONS.has(err.reason)) {
        const expired = err.reason === TokenVerificationErrorReason.TokenExpired;
        throw new InvalidTokenError(expired ? "expired" : "invalid", err.reason);
      }
      // Key loading, config or network failure: our problem, not the caller's.
      throw new Error("Could not verify session token", { cause: err });
    }

    // Session tokens v2 carry the session status. "pending" means the user still
    // has required steps to finish in Clerk, so treat them as not signed in.
    if (claims.sts === "pending") {
      throw new InvalidTokenError("invalid", "session-pending");
    }

    return {
      clerkUserId: claims.sub,
      sessionId: typeof claims.sid === "string" ? claims.sid : null,
      authorizedParty: typeof claims.azp === "string" ? claims.azp : null,
      expiresAt: new Date(claims.exp * 1000),
    };
  };
}
