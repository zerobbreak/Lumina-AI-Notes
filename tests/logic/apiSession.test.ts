import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { notesApi } from "@/lib/api/domains/notes.api";
import { ApiError } from "@/lib/api/errors";
import { apiPath } from "@/lib/api/path";
import { registerSessionHandlers } from "@/lib/api/session";
import { shouldRetry } from "@/lib/query-client";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const rejected = (code: string) => json(401, { error: { code, message: "Invalid session token" } });

/** Bearer tokens in the order requests were sent. */
let bearers: Array<string | null>;
/** Responses to hand back, in order. */
let responses: Response[];
const freshToken = vi.fn<() => Promise<string | null>>();
const onSessionLost = vi.fn();
let unregister: () => void;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/api/v1");
  bearers = [];
  responses = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit = {}) => {
      bearers.push(new Headers(init.headers).get("Authorization"));
      return responses.shift() ?? json(200, {});
    }),
  );
  freshToken.mockReset().mockResolvedValue("fresh");
  onSessionLost.mockReset();
  unregister = registerSessionHandlers({ freshToken, onSessionLost });
});

afterEach(() => {
  unregister();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiFetch with a rejected session token", () => {
  it.each(["token_expired", "invalid_token"])("gets a fresh token and retries once after %s", async (code) => {
    responses = [rejected(code), json(200, { id: "me" })];
    await expect(apiFetch(apiPath`/users/me`, { token: "stale" })).resolves.toEqual({ id: "me" });
    expect(bearers).toEqual(["Bearer stale", "Bearer fresh"]);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("sends the user to sign in when the fresh token is refused too", async () => {
    responses = [rejected("invalid_token"), rejected("invalid_token")];
    const error = (await apiFetch(apiPath`/users/me`, { token: "stale" }).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(bearers).toHaveLength(2);
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it("sends the user to sign in when Clerk has no session to refresh", async () => {
    freshToken.mockResolvedValue(null);
    responses = [rejected("token_expired")];
    await expect(apiFetch(apiPath`/users/me`, { token: "stale" })).rejects.toBeInstanceOf(ApiError);
    expect(bearers).toHaveLength(1);
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a 403", json(403, { error: { code: "forbidden" } })],
    ["a 404", json(404, { error: { code: "not_found" } })],
    ["a 401 that isn't about the token", json(401, { error: { code: "unauthenticated" } })],
  ])("doesn't retry %s", async (_label, response) => {
    responses = [response];
    await expect(apiFetch(apiPath`/notes/${"n1"}`, { token: "t" })).rejects.toBeInstanceOf(ApiError);
    expect(bearers).toHaveLength(1);
    expect(freshToken).not.toHaveBeenCalled();
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("recovers note saves too, which read the raw response", async () => {
    responses = [rejected("token_expired"), json(200, { id: "n1", title: "Saved" })];
    await expect(notesApi.update("stale", "n1", { title: "Saved" })).resolves.toMatchObject({ title: "Saved" });
    expect(bearers).toEqual(["Bearer stale", "Bearer fresh"]);
  });

  it("still reports a version conflict on note saves", async () => {
    responses = [json(409, { error: { code: "version_conflict", message: "Changed" }, note: { id: "n1" } })];
    await expect(notesApi.update("t", "n1", { title: "x" })).rejects.toMatchObject({ name: "VersionConflictError" });
  });
});

describe("shouldRetry", () => {
  it("never retries client errors", () => {
    expect(shouldRetry(0, new ApiError("Invalid session token", 401, "invalid_token"))).toBe(false);
    expect(shouldRetry(0, new ApiError("Not found", 404))).toBe(false);
  });

  it("retries server and network errors once", () => {
    expect(shouldRetry(0, new ApiError("Internal server error", 500))).toBe(true);
    expect(shouldRetry(1, new ApiError("Internal server error", 500))).toBe(false);
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
  });
});
