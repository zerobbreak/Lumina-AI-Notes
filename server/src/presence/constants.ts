/** How long before a presence row is stale (3 min; client heartbeats every 120s). */
export const PRESENCE_TIMEOUT_MS = 180_000;

export function presenceCutoff(now = Date.now()) {
  return new Date(now - PRESENCE_TIMEOUT_MS);
}
