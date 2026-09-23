import { UserFacingError } from "../ai/errors.js";

const TRANSIENT_MESSAGE =
  /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|rate.?limit|quota|timed? ?out|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed|network|not valid JSON|empty notes/i;

/**
 * Whether trying again later could succeed: rate limits, 5xx, timeouts,
 * dropped connections, a malformed model response. Anything else (bad input,
 * a missing file, a message written for users) fails the job straight away.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof UserFacingError) return false;
  if (!(error instanceof Error)) return false;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return status === 429 || status >= 500;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  const code = (error as { code?: unknown }).code;
  const text = `${error.message} ${typeof code === "string" ? code : ""}`;
  return TRANSIENT_MESSAGE.test(text);
}
