import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import {
  deadlines,
  documents,
  files,
  flashcardDecks,
  flashcards,
  noteCollaborators,
  notes,
  quizDecks,
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
  await db.delete(users); // cascades to everything else
  await db.delete(documents); // no user column
  fake = fakeStorage();
  app = buildApp({ storage: fake.storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
  patch: (path: string) => request(app).patch(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const me = async (user: string) => (await as(user).get("/api/v1/users/me")).body;

async function createCourse(user: string, name = "Cell Biology") {
  const res = await as(user).post("/api/v1/courses").send({ name, code: "BIO-101" });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

async function addModule(user: string, courseId: string, title = "Week 1") {
  const res = await as(user).post(`/api/v1/courses/${courseId}/modules`).send({ title });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

/** Files a note, deadline, upload, flashcard deck and quiz deck under the course (and module). */
async function fillCourse(userId: string, courseId: string, moduleId?: string) {
  const [note] = await db.insert(notes).values({ userId, title: "Mitosis", courseId, moduleId }).returning();
  await db.insert(deadlines).values({
    userId,
    title: "Lab report",
    dueAt: new Date(),
    kind: "assignment",
    courseId,
    moduleId,
  });
  const storageKey = `users/${userId}/${courseId}.pdf`;
  fake.objects.set(storageKey, { size: 1, contentType: "application/pdf" });
  await db.insert(files).values({ userId, name: "Slides.pdf", type: "pdf", storageKey, courseId });
  await db.insert(documents).values({ storageKey, courseId: "BIO-101", text: "chunk", embedding: Array(768).fill(0) });
  const [deck] = await db.insert(flashcardDecks).values({ userId, title: "Cells", courseId }).returning();
  await db.insert(flashcards).values({ userId, deckId: deck.id, front: "Q", back: "A" });
  await db.insert(quizDecks).values({ userId, title: "Quiz", courseId });
  return { note, storageKey };
}

describe("course and module edits", () => {
  it("creates a course with a server id and no modules", async () => {
    const course = await createCourse(ALICE);
    expect(course).toMatchObject({ name: "Cell Biology", code: "BIO-101", modules: [] });
    expect(course.id).toEqual(expect.any(String));
    expect((await me(ALICE)).courses).toEqual([course]);
  });

  it("renames a course and changes its note style", async () => {
    const course = await createCourse(ALICE);
    const res = await as(ALICE)
      .patch(`/api/v1/courses/${course.id}`)
      .send({ name: "Cell Bio", defaultNoteStyle: "mindmap", templatePromptDisabled: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: course.id, name: "Cell Bio", defaultNoteStyle: "mindmap", templatePromptDisabled: true });
    expect((await me(ALICE)).courses[0]).toMatchObject({ name: "Cell Bio", defaultNoteStyle: "mindmap" });
  });

  it("rejects an unknown note style", async () => {
    const course = await createCourse(ALICE);
    const res = await as(ALICE).patch(`/api/v1/courses/${course.id}`).send({ defaultNoteStyle: "cornell" });
    expect(res.status).toBe(400);
  });

  it("adds and renames modules", async () => {
    const course = await createCourse(ALICE);
    const mod = await addModule(ALICE, course.id);
    expect(mod).toEqual({ id: expect.any(String), title: "Week 1" });

    const res = await as(ALICE).patch(`/api/v1/courses/${course.id}/modules/${mod.id}`).send({ title: "Intro" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: mod.id, title: "Intro" });
    expect((await me(ALICE)).courses[0].modules).toEqual([{ id: mod.id, title: "Intro" }]);
  });

  it("keeps every change when edits arrive at once", async () => {
    const course = await createCourse(ALICE);
    await Promise.all([
      as(ALICE).patch(`/api/v1/courses/${course.id}`).send({ name: "Renamed" }),
      ...[1, 2, 3, 4].map((n) => addModule(ALICE, course.id, `Week ${n}`)),
      createCourse(ALICE, "Genetics"),
    ]);
    const { courses } = await me(ALICE);
    expect(courses).toHaveLength(2);
    expect(courses[0].name).toBe("Renamed");
    expect(courses[0].modules).toHaveLength(4);
  });

  it("404s on a missing course or module, and leaves the list alone", async () => {
    const course = await createCourse(ALICE);
    expect((await as(ALICE).patch("/api/v1/courses/nope").send({ name: "X" })).status).toBe(404);
    expect((await as(ALICE).post("/api/v1/courses/nope/modules").send({ title: "X" })).status).toBe(404);
    expect((await as(ALICE).patch(`/api/v1/courses/${course.id}/modules/nope`).send({ title: "X" })).status).toBe(404);
    expect((await as(ALICE).delete("/api/v1/courses/nope")).status).toBe(404);
    expect((await as(ALICE).delete(`/api/v1/courses/${course.id}/modules/nope`)).status).toBe(404);
    expect((await me(ALICE)).courses).toEqual([course]);
  });

  it("can't reach another user's course", async () => {
    const course = await createCourse(ALICE);
    expect((await as(BOB).patch(`/api/v1/courses/${course.id}`).send({ name: "Mine" })).status).toBe(404);
    expect((await as(BOB).delete(`/api/v1/courses/${course.id}`)).status).toBe(404);
    expect((await me(ALICE)).courses[0].name).toBe("Cell Biology");
  });
});

describe("deleting a course", () => {
  it("previews what will be deleted, including notes shared with others", async () => {
    const course = await createCourse(ALICE);
    const alice = await me(ALICE);
    const bob = await me(BOB);
    const { note } = await fillCourse(alice.id, course.id);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: bob.id, role: "viewer" });

    const res = await as(ALICE).get(`/api/v1/courses/${course.id}/delete-preview`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      notes: 1,
      deadlines: 1,
      files: 1,
      flashcardDecks: 1,
      quizDecks: 1,
      sharedNotes: 1,
    });
  });

  it("deletes everything filed under it, and its uploads from the bucket", async () => {
    const course = await createCourse(ALICE);
    const other = await createCourse(ALICE, "Genetics");
    const alice = await me(ALICE);
    const { storageKey } = await fillCourse(alice.id, course.id);
    await fillCourse(alice.id, other.id);

    const res = await as(ALICE).delete(`/api/v1/courses/${course.id}`);
    expect(res.status).toBe(204);

    expect((await me(ALICE)).courses.map((c: { id: string }) => c.id)).toEqual([other.id]);
    for (const table of [notes, deadlines, files, flashcardDecks, quizDecks]) {
      const rows = await db.select().from(table);
      expect(rows).toHaveLength(1);
      expect(rows[0].courseId).toBe(other.id);
    }
    expect(await db.select().from(flashcards)).toHaveLength(1);
    expect(await db.select().from(documents).where(eq(documents.storageKey, storageKey))).toHaveLength(0);
    expect(fake.mock.delete).toHaveBeenCalledExactlyOnceWith(storageKey);
  });

  it("leaves other users' rows alone even with the same course id", async () => {
    const course = await createCourse(ALICE);
    const bob = await me(BOB);
    await db.update(users).set({ courses: [{ id: course.id, name: "Bob's", code: "", modules: [] }] }).where(eq(users.id, bob.id));
    await fillCourse(bob.id, course.id);

    await as(ALICE).delete(`/api/v1/courses/${course.id}`);
    expect(await db.select().from(notes)).toHaveLength(1);
    expect((await me(BOB)).courses).toHaveLength(1);
  });

  it("still deletes the course if the bucket delete fails", async () => {
    const course = await createCourse(ALICE);
    await fillCourse((await me(ALICE)).id, course.id);
    fake.mock.delete.mockRejectedValueOnce(new Error("bucket down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect((await as(ALICE).delete(`/api/v1/courses/${course.id}`)).status).toBe(204);
    expect((await me(ALICE)).courses).toEqual([]);
    expect(await db.select().from(files)).toHaveLength(0);
  });
});

describe("deleting a module", () => {
  it("previews and deletes only the module's notes and deadlines", async () => {
    const course = await createCourse(ALICE);
    const mod = await addModule(ALICE, course.id);
    const keep = await addModule(ALICE, course.id, "Week 2");
    const alice = await me(ALICE);
    await fillCourse(alice.id, course.id, mod.id);
    await db.insert(notes).values({ userId: alice.id, title: "Other week", courseId: course.id, moduleId: keep.id });

    const preview = await as(ALICE).get(`/api/v1/courses/${course.id}/modules/${mod.id}/delete-preview`);
    expect(preview.body).toEqual({ notes: 1, deadlines: 1, sharedNotes: 0 });

    const res = await as(ALICE).delete(`/api/v1/courses/${course.id}/modules/${mod.id}`);
    expect(res.status).toBe(204);

    expect((await me(ALICE)).courses[0].modules).toEqual([keep]);
    expect((await db.select().from(notes)).map((n) => n.title)).toEqual(["Other week"]);
    expect(await db.select().from(deadlines)).toHaveLength(0);
    // Files and decks are filed by course, not module, so they stay.
    expect(await db.select().from(files)).toHaveLength(1);
    expect(await db.select().from(flashcardDecks)).toHaveLength(1);
    expect(fake.mock.delete).not.toHaveBeenCalled();
  });
});
