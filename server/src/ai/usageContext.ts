import { AsyncLocalStorage } from "node:async_hooks";
import type { Db } from "../db/client.js";
import { aiUsageEvents } from "../db/schema/index.js";

/** Who a Gemini call is on behalf of, and why. Set per request and per job. */
export type AiUsageScope = {
  db: Db;
  userId: string | null;
  feature: string;
};

const scopes = new AsyncLocalStorage<AiUsageScope>();

/** Runs `fn` with every Gemini call inside it (including awaited and background work) attributed to `scope`. */
export function withAiUsageScope<T>(scope: AiUsageScope, fn: () => T): T {
  return scopes.run(scope, fn);
}

/** For work that learns whose it is partway through, e.g. a job that loads its row first. */
export function setAiUsageUser(userId: string): void {
  const scope = scopes.getStore();
  if (scope) scope.userId = userId;
}

type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

/**
 * Stores one call's token counts. Never throws and never blocks the caller:
 * losing a usage row is better than failing the student's request.
 */
export function recordAiUsage(model: string, usage: UsageMetadata | undefined): void {
  const scope = scopes.getStore();
  if (!scope) return;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  scope.db
    .insert(aiUsageEvents)
    .values({
      userId: scope.userId,
      feature: scope.feature,
      model,
      inputTokens,
      outputTokens,
      totalTokens: usage?.totalTokenCount ?? inputTokens + outputTokens,
    })
    .catch((error: unknown) => console.warn("[ai-usage] couldn't record usage:", (error as Error).message));
}

const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]{20,}|\d+)$/i;

/** "POST /api/v1/chats/sessions/<uuid>/reply" -> "POST /api/v1/chats/sessions/:id/reply", so features group. */
export function featureName(method: string, path: string): string {
  const route = path
    .split("?")[0]
    .split("/")
    .map((segment) => (ID_SEGMENT.test(segment) ? ":id" : segment))
    .join("/");
  return `${method} ${route}`;
}
