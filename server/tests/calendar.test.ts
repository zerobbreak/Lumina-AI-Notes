import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb } from "./helpers.js";

const ALICE = "user_alice";

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
});

describe("GET /api/v1/calendar/activity", () => {
  it("returns notes and recordings created in the range", async () => {
    const note = await as(ALICE).post("/api/v1/notes").send({ title: "Day note" });
    expect(note.status).toBe(201);

    const startMs = Date.now() - 60_000;
    const endMs = Date.now() + 60_000;
    const res = await as(ALICE).get(`/api/v1/calendar/activity?startMs=${startMs}&endMs=${endMs}`);
    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].title).toBe("Day note");
    expect(typeof res.body.notes[0].createdAt).toBe("number");
    expect(res.body.recordings).toEqual([]);
  });
});
