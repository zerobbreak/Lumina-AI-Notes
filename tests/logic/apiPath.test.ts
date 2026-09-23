import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { collaborationApi } from "@/lib/api/domains/collaboration.api";
import { coursesApi } from "@/lib/api/domains/courses.api";
import { flashcardsApi } from "@/lib/api/domains/flashcards.api";
import { notesApi } from "@/lib/api/domains/notes.api";
import { presenceApi } from "@/lib/api/domains/presence.api";
import { getPublicNote } from "@/lib/api/domains/public.api";
import { quizzesApi } from "@/lib/api/domains/quizzes.api";
import { uploadsApi } from "@/lib/api/domains/uploads.api";
import { apiPath, UnsafePathSegmentError } from "@/lib/api/path";

const BASE = "https://api.example.test/api/v1";

/** Every request the code under test sent, as the browser would resolve it. */
let sent: Array<{ url: URL; method: string; auth: string | null }>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", BASE);
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      sent.push({ url: new URL(input), method: init.method ?? "GET", auth: headers.get("Authorization") });
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Ids an attacker could put in `?noteId=` / `?deckId=` to steer a request elsewhere. */
const HOSTILE_IDS = [
  "abc?",
  "abc#",
  "../courses/C1?",
  "..%2Fcourses%2FC1%3F",
  "a/b",
  "%2e%2e/x",
];

describe("apiPath", () => {
  it("encodes each value as exactly one segment", () => {
    expect(apiPath`/notes/${"a/b?c#d"}/presence`).toBe("/notes/a%2Fb%3Fc%23d/presence");
    expect(apiPath`/decks/${42}`).toBe("/decks/42");
  });

  it.each(["", ".", "..", "%2e", "%2E%2e", ".%2e"])("refuses the dot-segment or empty value %j", (value) => {
    expect(() => apiPath`/notes/${value}/presence`).toThrow(UnsafePathSegmentError);
  });

  it("keeps a query string out of the path", () => {
    expect(() => apiPath`/uploads/stat?key=x`).toThrow();
  });
});

describe("apiFetch", () => {
  it("sends the query option as the query string, leaving out empty values", async () => {
    await apiFetch(apiPath`/notifications`, { token: "t", query: { limit: 5, unreadOnly: undefined, q: "a&b" } });
    expect(sent[0].url.pathname).toBe("/api/v1/notifications");
    expect(sent[0].url.searchParams.get("limit")).toBe("5");
    expect(sent[0].url.searchParams.get("q")).toBe("a&b");
    expect(sent[0].url.searchParams.has("unreadOnly")).toBe(false);
  });

  it("only sends the token to the API origin", async () => {
    await apiFetch(apiPath`/notes/${"x"}`, { token: "secret" });
    expect(sent[0].url.origin).toBe("https://api.example.test");
    expect(sent[0].auth).toBe("Bearer secret");
  });
});

describe("domain helpers can't be steered to another endpoint", () => {
  // Each call names the one path it may reach, with the id standing in for ":id".
  const calls: Array<[string, (id: string) => Promise<unknown>, string, string]> = [
    ["presence heartbeat", (id) => presenceApi.heartbeat("t", id), "POST", "/notes/:id/presence/heartbeat"],
    ["presence leave", (id) => presenceApi.leave("t", id), "DELETE", "/notes/:id/presence"],
    ["flashcard deck", (id) => flashcardsApi.getDeck("t", id), "GET", "/flashcards/decks/:id"],
    ["mark deck studied", (id) => flashcardsApi.markDeckStudied("t", id), "POST", "/flashcards/decks/:id/studied"],
    ["quiz questions", (id) => quizzesApi.getQuestions("t", id), "GET", "/quizzes/decks/:id/questions"],
    ["delete course", (id) => coursesApi.delete("t", id), "DELETE", "/courses/:id"],
    ["collaborators", (id) => collaborationApi.listPeopleWithAccess("t", id), "GET", "/notes/:id/collaborators"],
    ["note update", (id) => notesApi.update("t", id, { title: "x" }), "PATCH", "/notes/:id"],
    ["public note", (id) => getPublicNote(id), "GET", "/public/notes/:id"],
  ];

  it.each(calls.flatMap(([name, call, method, route]) => HOSTILE_IDS.map((id) => [name, call, method, route, id] as const)))(
    "%s with id %j stays on its route",
    async (_name, call, method, route, id) => {
      await call(id).catch(() => {});
      expect(sent).toHaveLength(1);
      const { url } = sent[0];
      expect(sent[0].method).toBe(method);
      expect(url.pathname).toBe(`/api/v1${route.replace(":id", encodeURIComponent(id))}`);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    },
  );

  it("refuses dot-segment ids before any request is sent", async () => {
    await expect(async () => presenceApi.leave("t", "..")).rejects.toThrow(UnsafePathSegmentError);
    await expect(async () => coursesApi.deleteModule("t", "C1", "..")).rejects.toThrow(UnsafePathSegmentError);
    expect(sent).toHaveLength(0);
  });

  it("puts an upload key in the query string, encoded", async () => {
    await uploadsApi.stat("t", "users/u1/x/a b?.pdf");
    expect(sent[0].url.pathname).toBe("/api/v1/uploads/stat");
    expect(sent[0].url.searchParams.get("key")).toBe("users/u1/x/a b?.pdf");
  });
});
