import { toast } from "sonner";
import { dispatchAppCommand } from "@/lib/appCommands";
import type { ApiError } from "./errors";

/** API error codes that mean "you've used your plan's allowance", not "something broke". */
const LIMIT_CODES = new Set([
  "daily_limit_reached",
  "audio_limit_exceeded",
  "storage_limit_reached",
  "upload_quota_exceeded",
]);

export function isLimitError(error: ApiError): boolean {
  return LIMIT_CODES.has(error.code ?? "");
}

let lastLimit: { code: string; message: string } | null = null;

/** The most recent limit the user hit, so "Ask for more" can say which one. */
export function lastLimitHit() {
  return lastLimit;
}

/**
 * One toast however many requests hit the limit at once, with a way to ask
 * for more. Each hit is a pricing signal for after the beta, so make asking easy.
 */
export function notifyLimitReached(error: ApiError): void {
  if (typeof window === "undefined" || !isLimitError(error)) return;
  lastLimit = { code: error.code!, message: error.message };
  toast.warning("You've hit a beta limit", {
    id: "beta-limit-reached",
    description: error.message,
    duration: 10_000,
    action: { label: "Ask for more", onClick: () => dispatchAppCommand("feedback:more") },
  });
}
