import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { announcementEvents, users } from "../src/db/schema/index.js";
import { MAX_ANNOUNCEMENT_EVENTS_PER_USER } from "../src/routes/announcements.js";
import { bearer, buildApp, createTestDb } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  app = buildApp({ db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const record = (user: string, announcementId: string, kind: string) =>
  as(user).post("/api/v1/announcements/events").send({ announcementId, kind });

describe("announcement events", () => {
  it("requires a session", async () => {
    const res = await request(app).get("/api/v1/announcements/events");
    expect(res.status).toBe(401);
  });

  it("records an event and lists it back", async () => {
    const created = await record(ALICE, "appearance-launch", "seen");
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ announcementId: "appearance-launch", kind: "seen" });
    expect(typeof created.body.at).toBe("number");

    const list = await as(ALICE).get("/api/v1/announcements/events");
    expect(list.status).toBe(200);
    expect(list.body).toEqual([created.body]);
  });

  it("keeps the first time when the same kind is recorded again", async () => {
    const first = await record(ALICE, "appearance-launch", "dismissed");
    await new Promise((r) => setTimeout(r, 5));
    const again = await record(ALICE, "appearance-launch", "dismissed");

    expect(again.status).toBe(200);
    expect(again.body.at).toBe(first.body.at);
    expect((await as(ALICE).get("/api/v1/announcements/events")).body).toHaveLength(1);
  });

  it("keeps each kind separately", async () => {
    await record(ALICE, "appearance-launch", "seen");
    await record(ALICE, "appearance-launch", "clicked");

    const kinds = (await as(ALICE).get("/api/v1/announcements/events")).body.map(
      (e: { kind: string }) => e.kind,
    );
    expect(kinds.sort()).toEqual(["clicked", "seen"]);
  });

  it("rejects unknown kinds and malformed ids", async () => {
    expect((await record(ALICE, "appearance-launch", "liked")).status).toBe(400);
    expect((await record(ALICE, "../etc", "seen")).status).toBe(400);
    expect((await record(ALICE, "Has Spaces", "seen")).status).toBe(400);
    expect((await record(ALICE, "a".repeat(81), "seen")).status).toBe(400);
  });

  it("never shows one user's events to another", async () => {
    await record(ALICE, "appearance-launch", "seen");

    const bobs = await as(BOB).get("/api/v1/announcements/events");
    expect(bobs.body).toEqual([]);
  });

  it("resets only the caller's own events", async () => {
    await record(ALICE, "appearance-launch", "seen");
    await record(ALICE, "appearance-launch", "dismissed");
    await record(BOB, "appearance-launch", "seen");

    const reset = await as(ALICE).delete("/api/v1/announcements/events");
    expect(reset.body).toEqual({ deleted: 2 });

    expect((await as(ALICE).get("/api/v1/announcements/events")).body).toEqual([]);
    expect((await as(BOB).get("/api/v1/announcements/events")).body).toHaveLength(1);
  });

  it("caps how many events one user can store, but still accepts repeats", async () => {
    await record(ALICE, "appearance-launch", "seen");
    const aliceId = (await as(ALICE).get("/api/v1/users/me")).body.id as string;
    await db.insert(announcementEvents).values(
      Array.from({ length: MAX_ANNOUNCEMENT_EVENTS_PER_USER - 1 }, (_, i) => ({
        userId: aliceId,
        announcementId: `filler-${i}`,
        kind: "seen" as const,
      })),
    );

    const over = await record(ALICE, "one-more", "seen");
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe("announcement_events_limit");

    expect((await record(ALICE, "appearance-launch", "seen")).status).toBe(200);
    expect((await record(BOB, "one-more", "seen")).status).toBe(201);
  });
});
