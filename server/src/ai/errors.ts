/** An error whose message was written for end users and is safe to send them. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

const BUSY = /RESOURCE_EXHAUSTED|quota|rate.?limit|\b429\b/i;

/**
 * What to tell the client about a failure. Library errors (Gemini, S3, the
 * network) can carry request URLs, hosts or account details, so only our own
 * UserFacingError messages go out verbatim; the caller logs the real error.
 */
export function clientMessage(error: unknown, fallback: string): string {
  if (error instanceof UserFacingError) return error.message;
  const text = error instanceof Error ? error.message : String(error);
  if (BUSY.test(text)) return "The AI service is busy right now. Please try again in a moment.";
  return fallback;
}
