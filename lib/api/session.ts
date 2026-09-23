/**
 * Bridges Clerk (a React hook) to apiFetch (plain functions). A component
 * inside ClerkProvider registers these; apiFetch uses them to recover from a
 * rejected session token without every call site having to.
 */
type SessionHandlers = {
  /** A new token straight from Clerk, bypassing its cache; null if signed out. */
  freshToken: () => Promise<string | null>;
  /** The session can't be recovered: send the user to sign in again. */
  onSessionLost: () => void;
};

let handlers: SessionHandlers | null = null;

/** Returns an unregister function, for use as an effect cleanup. */
export function registerSessionHandlers(next: SessionHandlers): () => void {
  handlers = next;
  return () => {
    if (handlers === next) handlers = null;
  };
}

export function freshToken(): Promise<string | null> {
  return handlers ? handlers.freshToken() : Promise.resolve(null);
}

export function sessionLost(): void {
  handlers?.onSessionLost();
}

/**
 * Error codes the API uses when it refused the token itself (see the server's
 * authenticate middleware), as opposed to refusing what the user asked for.
 */
export const REJECTED_TOKEN_CODES = new Set(["token_expired", "invalid_token"]);
