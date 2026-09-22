import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { noteCollaborators, presence, users } from "../src/db/schema/index.js";
import { PRESENCE_TIMEOUT_MS } from "../src/presence/constants.js";
import { bearer, buildApp, createTestDb } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";
const CAROL = "user_carol";

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

const userId = async (user: string) => (await as(user).get("/api/v1/users/me")).body.id as string;

async function createNote(user: string) {
  const res = await as(user).post("/api/v1/notes").send({ title: "Live note" });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

describe("presence", () => {
  it("records heartbeats and lists other active viewers", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: await userId(BOB), role: "viewer" });

    expect((await as(ALICE).post(`/api/v1/notes/${note.id}/presence/heartbeat`)).body).toEqual({ success: true });
    expect((await as(BOB).post(`/api/v1/notes/${note.id}/presence/heartbeat`)).body).toEqual({ success: true });

    const viewers = await as(ALICE).get(`/api/v1/notes/${note.id}/presence/viewers`);
    expect(viewers.status).toBe(200);
    expect(viewers.body).toHaveLength(1);
    expect(viewers.body[0]).toMatchObject({ userId: await userId(BOB), userName: BOB });

    const count = await as(ALICE).get(`/api/v1/notes/${note.id}/presence/count`);
    expect(count.body).toEqual({ count: 1 });
  });

  it("removes presence on leave", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: await userId(BOB), role: "viewer" });
    await as(BOB).post(`/api/v1/notes/${note.id}/presence/heartbeat`);
    expect((await as(ALICE).get(`/api/v1/notes/${note.id}/presence/count`)).body.count).toBe(1);

    await as(BOB).delete(`/api/v1/notes/${note.id}/presence`);
    expect((await as(ALICE).get(`/api/v1/notes/${note.id}/presence/count`)).body.count).toBe(0);
    expect(await db.select().from(presence).where(eq(presence.noteId, note.id))).toHaveLength(0);
  });

  it("ignores stale presence rows", async () => {
    const note = await createNote(ALICE);
    const bobId = await userId(BOB);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: bobId, role: "viewer" });
    await db.insert(presence).values({
      noteId: note.id,
      userId: bobId,
      userName: BOB,
      lastSeen: new Date(Date.now() - PRESENCE_TIMEOUT_MS - 1_000),
    });

    expect((await as(ALICE).get(`/api/v1/notes/${note.id}/presence/viewers`)).body).toEqual([]);
    expect((await as(ALICE).get(`/api/v1/notes/${note.id}/presence/count`)).body).toEqual({ count: 0 });
  });

  it("requires note access to see or update presence", async () => {
    const note = await createNote(ALICE);
    expect((await as(CAROL).post(`/api/v1/notes/${note.id}/presence/heartbeat`)).status).toBe(404);
    expect((await as(CAROL).get(`/api/v1/notes/${note.id}/presence/viewers`)).status).toBe(404);
  });
});
