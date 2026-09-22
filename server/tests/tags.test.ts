import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { notes, noteTags, tags, users } from "../src/db/schema/index.js";
import { MAX_TAGS_PER_USER } from "../src/routes/tags.js";
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
  patch: (path: string) => request(app).patch(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const userId = async (user: string) => (await as(user).get("/api/v1/users/me")).body.id as string;

async function createTag(user: string, name: string, color = "#6366f1") {
  const res = await as(user).post("/api/v1/tags").send({ name, color });
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string };
}

async function tagNote(user: string, tagId: string, fields: Partial<typeof notes.$inferInsert> = {}) {
  const [note] = await db.insert(notes).values({ userId: await userId(user), title: "n", ...fields }).returning();
  await db.insert(noteTags).values({ noteId: note.id, tagId });
  return note;
}

describe("POST /api/v1/tags", () => {
  it("creates a tag, trimming the name", async () => {
    const res = await as(ALICE).post("/api/v1/tags").send({ name: "  exam  ", color: "#EF4444" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "exam", color: "#EF4444" });
  });

  it("returns 409 with the existing tag for a duplicate name", async () => {
    const first = await createTag(ALICE, "exam");
    const res = await as(ALICE).post("/api/v1/tags").send({ name: "exam", color: "#22c55e" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("tag_exists");
    expect(res.body.tag).toMatchObject({ id: first.id, name: "exam", color: "#6366f1" });
  });

  it("treats names as case-sensitive, and names as per-user", async () => {
    await createTag(ALICE, "exam");
    await createTag(ALICE, "Exam");
    await createTag(BOB, "exam");
    expect(await db.select().from(tags)).toHaveLength(3);
  });

  it("validates name and colour", async () => {
    const bad = [
      { name: "", color: "#fff" },
      { name: "   ", color: "#fff" },
      { name: "x".repeat(51), color: "#fff" },
      { name: "ok", color: "red" },
      { name: "ok", color: "#12345" },
      { name: "ok" },
    ];
    for (const body of bad) {
      expect((await as(ALICE).post("/api/v1/tags").send(body)).status).toBe(400);
    }
    expect((await as(ALICE).post("/api/v1/tags").send({ name: "ok", color: "#fff" })).status).toBe(201);
  });

  it(`stops at ${MAX_TAGS_PER_USER} tags`, async () => {
    const id = await userId(ALICE);
    await db
      .insert(tags)
      .values(Array.from({ length: MAX_TAGS_PER_USER }, (_, i) => ({ userId: id, name: `t${i}`, color: "#fff" })));
    const res = await as(ALICE).post("/api/v1/tags").send({ name: "one more", color: "#fff" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("too_many_tags");
  });
});

describe("GET /api/v1/tags", () => {
  it("counts top-level notes, archived included, most-used first then by name", async () => {
    const exam = await createTag(ALICE, "exam");
    const lab = await createTag(ALICE, "lab");
    const alpha = await createTag(ALICE, "alpha");
    await createTag(ALICE, "zeta");

    const parent = await tagNote(ALICE, exam.id);
    await tagNote(ALICE, exam.id, { isArchived: true });
    await tagNote(ALICE, exam.id, { parentNoteId: parent.id }); // sub-page: not counted
    await tagNote(ALICE, lab.id);
    await tagNote(ALICE, alpha.id);
    await createTag(BOB, "bob's");

    const res = await as(ALICE).get("/api/v1/tags");
    expect(res.status).toBe(200);
    expect(res.body.map((t: { name: string; count: number }) => [t.name, t.count])).toEqual([
      ["exam", 2],
      ["alpha", 1],
      ["lab", 1],
      ["zeta", 0],
    ]);
    expect(res.body[0]).toMatchObject({ id: exam.id, color: "#6366f1" });
    expect(typeof res.body[0].createdAt).toBe("number");
  });
});

describe("PATCH /api/v1/tags/:id", () => {
  it("renames and recolours", async () => {
    const tag = await createTag(ALICE, "exam");
    const res = await as(ALICE).patch(`/api/v1/tags/${tag.id}`).send({ name: "finals", color: "#000" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: tag.id, name: "finals", color: "#000" });
  });

  it("returns 409 with the other tag when renaming onto a used name", async () => {
    const exam = await createTag(ALICE, "exam");
    const lab = await createTag(ALICE, "lab");
    const res = await as(ALICE).patch(`/api/v1/tags/${lab.id}`).send({ name: "exam" });
    expect(res.status).toBe(409);
    expect(res.body.tag.id).toBe(exam.id);
    // Renaming to its own name, or changing only case, is fine.
    expect((await as(ALICE).patch(`/api/v1/tags/${exam.id}`).send({ name: "exam" })).status).toBe(200);
    expect((await as(ALICE).patch(`/api/v1/tags/${exam.id}`).send({ name: "Exam" })).body.name).toBe("Exam");
  });

  it("accepts an empty patch and 404s for other users' tags", async () => {
    const tag = await createTag(ALICE, "exam");
    expect((await as(ALICE).patch(`/api/v1/tags/${tag.id}`).send({})).body.name).toBe("exam");
    expect((await as(BOB).patch(`/api/v1/tags/${tag.id}`).send({ name: "mine" })).status).toBe(404);
    expect((await as(ALICE).patch("/api/v1/tags/nope").send({ name: "x" })).status).toBe(404);
  });
});

describe("DELETE /api/v1/tags/:id", () => {
  it("deletes the tag and takes it off every note", async () => {
    const exam = await createTag(ALICE, "exam");
    const lab = await createTag(ALICE, "lab");
    const note = await tagNote(ALICE, exam.id);
    await db.insert(noteTags).values({ noteId: note.id, tagId: lab.id });

    expect((await as(BOB).delete(`/api/v1/tags/${exam.id}`)).status).toBe(404);
    expect((await as(ALICE).delete(`/api/v1/tags/${exam.id}`)).status).toBe(204);

    expect((await as(ALICE).get(`/api/v1/notes/${note.id}`)).body.tagIds).toEqual([lab.id]);
    expect((await as(ALICE).get("/api/v1/tags")).body.map((t: { name: string }) => t.name)).toEqual(["lab"]);
  });
});
