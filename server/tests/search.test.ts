import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import {
  flashcardDecks,
  files,
  notes,
  noteTags,
  tags,
  users,
} from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb, fakeStorage } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";

let db: Db;
let closeDb: () => Promise<void>;
let fake: ReturnType<typeof fakeStorage>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  fake = fakeStorage();
  app = buildApp({ storage: fake.storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
});

const aliceId = async () => (await as(ALICE).get("/api/v1/auth/session")).body.user.id as string;

describe("GET /api/v1/search", () => {
  it("returns empty results for an empty query", async () => {
    const res = await as(ALICE).get("/api/v1/search?query=");
    expect(res.body).toEqual({ results: [], limitReached: false });
  });

  it("finds notes, files, and flashcard decks by title/name", async () => {
    const userId = await aliceId();

    await db.insert(notes).values([
      { userId, title: "Mitosis lecture notes", content: "<p>cell division</p>" },
      { userId, title: "Shopping list", content: "<p>milk</p>" },
    ]);

    await db.insert(files).values({
      userId,
      name: "Mitosis diagram.pdf",
      type: "pdf",
      url: "https://example.test/mitosis.pdf",
    });

    await db.insert(flashcardDecks).values({
      userId,
      title: "Mitosis flashcards",
      cardCount: 5,
    });

    const res = await as(ALICE).get("/api/v1/search?query=mitosis");
    expect(res.body.results.map((r: { type: string; title: string }) => `${r.type}:${r.title}`)).toEqual(
      expect.arrayContaining([
        "note:Mitosis lecture notes",
        "file:Mitosis diagram.pdf",
        "deck:Mitosis flashcards",
      ]),
    );
  });

  it("filters notes by tag intersection and skips files/decks when tags are set", async () => {
    const userId = await aliceId();

    const [examTag] = await db
      .insert(tags)
      .values({ userId, name: "exam", color: "#6366f1" })
      .returning();
    const [labTag] = await db
      .insert(tags)
      .values({ userId, name: "lab", color: "#22c55e" })
      .returning();

    const [tagged] = await db
      .insert(notes)
      .values({ userId, title: "Mitosis exam prep", content: "<p>review</p>" })
      .returning();
    await db.insert(notes).values({ userId, title: "Mitosis draft", content: "<p>wip</p>" });
    await db.insert(noteTags).values([
      { noteId: tagged.id, tagId: examTag.id },
      { noteId: tagged.id, tagId: labTag.id },
    ]);

    await db.insert(files).values({
      userId,
      name: "Mitosis.pdf",
      type: "pdf",
      url: "https://example.test/mitosis.pdf",
    });

    const res = await as(ALICE).get(
      `/api/v1/search?query=mitosis&tagIds=${examTag.id}&tagIds=${labTag.id}`,
    );
    expect(res.body.results).toEqual([
      {
        type: "note",
        id: tagged.id,
        title: "Mitosis exam prep",
        subtitle: "Note",
        url: `/dashboard?noteId=${tagged.id}`,
      },
    ]);
  });

  it("does not return another user's matches", async () => {
    const aliceUserId = await aliceId();
    await as(BOB).get("/api/v1/auth/session");
    const [bobUser] = await db.select().from(users).where(eq(users.clerkUserId, BOB));

    await db.insert(notes).values({ userId: aliceUserId, title: "Alice mitosis", content: "<p>x</p>" });
    await db.insert(notes).values({ userId: bobUser!.id, title: "Bob mitosis", content: "<p>x</p>" });

    const res = await as(ALICE).get("/api/v1/search?query=mitosis&type=note");
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].title).toBe("Alice mitosis");
  });
});

describe("GET /api/v1/search/note-content", () => {
  it("returns a snippet centred on literal keyword hits", async () => {
    const userId = await aliceId();
    await db.insert(notes).values({
      userId,
      title: "Biology",
      content:
        "<p>Intro paragraph.</p><p>The process of <strong>mitosis</strong> divides the nucleus during cell division.</p>",
    });

    const res = await as(ALICE).get("/api/v1/search/note-content?query=mitosis");
    expect(res.body.matches).toHaveLength(1);
    expect(res.body.matches[0]).toMatchObject({
      title: "Biology",
      matchedKeywords: ["mitosis"],
    });
    expect(res.body.matches[0].snippet.toLowerCase()).toContain("mitosis");
  });

  it("returns no matches when keywords are too short", async () => {
    const res = await as(ALICE).get("/api/v1/search/note-content?query=a");
    expect(res.body.matches).toEqual([]);
  });
});

describe("GET /api/v1/search/semantic", () => {
  it("returns the Convex stub shape", async () => {
    const res = await as(ALICE).get("/api/v1/search/semantic?query=photosynthesis&limit=5");
    expect(res.body).toEqual({ results: [], limited: false, maxResults: 5 });
  });
});
