import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { files, noteCollaborators, noteLinkedFiles, notes, noteTags, tags, users } from "../src/db/schema/index.js";
import { MAX_NOTE_CHARS } from "../src/routes/notes.js";
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
  patch: (path: string) => request(app).patch(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const userId = async (user: string) => (await as(user).get("/api/v1/users/me")).body.id as string;

async function createNote(user: string, body: Record<string, unknown> = {}) {
  const res = await as(user).post("/api/v1/notes").send({ title: "Mitosis", ...body });
  expect(res.status).toBe(201);
  return res.body;
}

async function share(noteId: string, user: string, role: "viewer" | "editor") {
  await db.insert(noteCollaborators).values({ noteId, userId: await userId(user), role });
}

async function createTag(user: string, name = "exam") {
  const [tag] = await db.insert(tags).values({ userId: await userId(user), name, color: "red" }).returning();
  return tag.id;
}

/** Alice with a course (style mindmap) holding one module. */
async function aliceWithCourse() {
  const course = (await as(ALICE).post("/api/v1/courses").send({ name: "Biology", code: "BIO-101" })).body;
  const mod = (await as(ALICE).post(`/api/v1/courses/${course.id}/modules`).send({ title: "Week 1" })).body;
  return { courseId: course.id as string, moduleId: mod.id as string };
}

describe("POST /api/v1/notes", () => {
  it("creates a quick note with defaults", async () => {
    const note = await createNote(ALICE, { major: "biology" });
    expect(note).toMatchObject({
      title: "Mitosis",
      content: "",
      noteType: "quick",
      style: "standard",
      major: "biology",
      version: 0,
      wordCount: 0,
      isPinned: false,
      isArchived: false,
      tagIds: [],
      linkedDocumentIds: [],
    });
    expect(typeof note.lastAccessedAt).toBe("number");
    for (const hidden of ["embedding", "searchTitle", "searchContent"]) {
      expect(note).not.toHaveProperty(hidden);
    }
  });

  it("picks the style from the course, then the user, then standard", async () => {
    const { courseId } = await aliceWithCourse();
    await as(ALICE).patch("/api/v1/users/me/preferences").send({ noteStyle: "outline" });

    expect((await createNote(ALICE)).style).toBe("outline");
    expect((await createNote(ALICE, { courseId })).style).toBe("outline");

    await as(ALICE).patch(`/api/v1/courses/${courseId}`).send({ defaultNoteStyle: "mindmap" });
    expect((await createNote(ALICE, { courseId })).style).toBe("mindmap");
    expect((await createNote(ALICE, { courseId, style: "standard" })).style).toBe("standard");
  });

  it("files notes in a course or module as pages", async () => {
    const { courseId, moduleId } = await aliceWithCourse();
    expect(await createNote(ALICE, { courseId, moduleId })).toMatchObject({ courseId, moduleId, noteType: "page" });
    // A module alone finds its course.
    expect(await createNote(ALICE, { moduleId })).toMatchObject({ courseId, moduleId });
  });

  it("rejects folders the user doesn't have", async () => {
    const { courseId } = await aliceWithCourse();
    const other = (await as(ALICE).post("/api/v1/courses").send({ name: "Chem", code: "" })).body;
    const otherModule = (await as(ALICE).post(`/api/v1/courses/${other.id}/modules`).send({ title: "W1" })).body;

    expect((await as(ALICE).post("/api/v1/notes").send({ title: "x", courseId: "nope" })).status).toBe(400);
    expect((await as(ALICE).post("/api/v1/notes").send({ title: "x", moduleId: "nope" })).status).toBe(400);
    const wrongCourse = await as(ALICE).post("/api/v1/notes").send({ title: "x", courseId, moduleId: otherModule.id });
    expect(wrongCourse.status).toBe(400);
    expect(wrongCourse.body.error.message).toBe("That module isn't in this course");
    // Bob can't file into Alice's course.
    expect((await as(BOB).post("/api/v1/notes").send({ title: "x", courseId })).status).toBe(400);
  });

  it("files sub-pages with their parent unless told otherwise", async () => {
    const { courseId, moduleId } = await aliceWithCourse();
    const parent = await createNote(ALICE, { courseId, moduleId });
    const child = await createNote(ALICE, { parentNoteId: parent.id });
    expect(child).toMatchObject({ parentNoteId: parent.id, courseId, moduleId, noteType: "page" });

    const moved = await createNote(ALICE, { parentNoteId: parent.id, courseId });
    expect(moved).toMatchObject({ courseId, moduleId: null });
  });

  it("gives an editor's sub-page to the parent's owner and makes the editor a collaborator", async () => {
    const parent = await createNote(ALICE);
    await share(parent.id, BOB, "editor");

    const child = await createNote(BOB, { parentNoteId: parent.id, title: "Bob's page" });
    expect(child.userId).toBe(await userId(ALICE));
    const collaborators = await db.select().from(noteCollaborators).where(eq(noteCollaborators.noteId, child.id));
    expect(collaborators).toMatchObject([{ userId: await userId(BOB), role: "editor" }]);
    expect((await as(ALICE).get(`/api/v1/notes/${child.id}`)).status).toBe(200);
    expect((await as(BOB).get(`/api/v1/notes/${child.id}`)).status).toBe(200);
  });

  it("doesn't let viewers or strangers add sub-pages", async () => {
    const parent = await createNote(ALICE);
    await share(parent.id, BOB, "viewer");
    expect((await as(BOB).post("/api/v1/notes").send({ title: "x", parentNoteId: parent.id })).status).toBe(403);
    expect((await as(CAROL).post("/api/v1/notes").send({ title: "x", parentNoteId: parent.id })).status).toBe(404);
  });

  it("tags with the owner's tags only", async () => {
    const tag = await createTag(ALICE);
    const bobTag = await createTag(BOB);
    expect((await createNote(ALICE, { tagIds: [tag, tag] })).tagIds).toEqual([tag]);
    expect((await as(ALICE).post("/api/v1/notes").send({ title: "x", tagIds: [bobTag] })).status).toBe(400);

    const parent = await createNote(ALICE);
    await share(parent.id, BOB, "editor");
    const res = await as(BOB).post("/api/v1/notes").send({ title: "x", parentNoteId: parent.id, tagIds: [tag] });
    expect(res.status).toBe(403);
  });

  it("rejects a recording or note that isn't the owner's", async () => {
    const bobNote = await createNote(BOB);
    expect((await as(ALICE).post("/api/v1/notes").send({ title: "x", sourceRecordingId: "nope" })).status).toBe(400);
    const res = await as(ALICE).post("/api/v1/notes").send({ title: "x", quickCaptureExpandedNoteId: bobNote.id });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/notes/:id", () => {
  it("lets the owner and collaborators read, and hides it from everyone else", async () => {
    const note = await createNote(ALICE);
    await share(note.id, BOB, "viewer");
    expect((await as(ALICE).get(`/api/v1/notes/${note.id}`)).body.title).toBe("Mitosis");
    expect((await as(BOB).get(`/api/v1/notes/${note.id}`)).status).toBe(200);
    expect((await as(CAROL).get(`/api/v1/notes/${note.id}`)).status).toBe(404);
    expect((await as(ALICE).get("/api/v1/notes/nope")).status).toBe(404);
  });

  it("includes linkedDocumentIds from the junction table", async () => {
    const note = await createNote(ALICE);
    const aliceId = await userId(ALICE);
    const [file] = await db
      .insert(files)
      .values({ userId: aliceId, name: "syllabus.pdf", type: "pdf" })
      .returning();
    await db.insert(noteLinkedFiles).values({ noteId: note.id, fileId: file!.id });

    const res = await as(ALICE).get(`/api/v1/notes/${note.id}`);
    expect(res.body.linkedDocumentIds).toEqual([file!.id]);
  });
});

describe("PATCH /api/v1/notes/:id", () => {
  it("renames without a version and doesn't bump it", async () => {
    const note = await createNote(ALICE);
    const res = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ title: "Meiosis", style: "outline" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "Meiosis", style: "outline", version: 0 });
  });

  it("accepts an empty patch", async () => {
    const note = await createNote(ALICE);
    const res = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Mitosis");
  });

  it("requires the version for content saves and bumps it", async () => {
    const note = await createNote(ALICE);
    const missing = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ content: "<p>hi</p>" });
    expect(missing.status).toBe(400);

    const saved = await as(ALICE)
      .patch(`/api/v1/notes/${note.id}`)
      .send({ content: "<p>hi</p>", wordCount: 1, version: 0 });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ content: "<p>hi</p>", wordCount: 1, version: 1 });
  });

  it("returns 409 with the current note when someone else saved first", async () => {
    const note = await createNote(ALICE);
    await share(note.id, BOB, "editor");

    await as(BOB).patch(`/api/v1/notes/${note.id}`).send({ content: "Bob's", version: 0 });
    const stale = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ content: "Alice's", version: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("version_conflict");
    expect(stale.body.note).toMatchObject({ content: "Bob's", version: 1 });
    // Nothing from the stale save landed, not even its other fields.
    expect((await as(ALICE).get(`/api/v1/notes/${note.id}`)).body.content).toBe("Bob's");
  });

  it("only lets one of two simultaneous saves win", async () => {
    const note = await createNote(ALICE);
    const results = await Promise.all(
      ["one", "two", "three"].map((content) =>
        as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ content, version: 0 }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
  });

  it("saves outline data with the version", async () => {
    const note = await createNote(ALICE);
    const outlineMetadata = { totalItems: 3, completedTasks: 1, collapsedNodes: ["n1"] };
    const res = await as(ALICE)
      .patch(`/api/v1/notes/${note.id}`)
      .send({ outlineData: '{"root":[]}', outlineMetadata, version: 0 });
    expect(res.body).toMatchObject({ outlineData: '{"root":[]}', outlineMetadata, version: 1 });
  });

  it("lets editors edit but not viewers", async () => {
    const note = await createNote(ALICE);
    await share(note.id, BOB, "editor");
    await share(note.id, CAROL, "viewer");
    expect((await as(BOB).patch(`/api/v1/notes/${note.id}`).send({ title: "Bob's" })).status).toBe(200);
    expect((await as(CAROL).patch(`/api/v1/notes/${note.id}`).send({ title: "Carol's" })).status).toBe(403);
  });

  it("replaces tags, owner only", async () => {
    const [exam, lab] = [await createTag(ALICE, "exam"), await createTag(ALICE, "lab")];
    const note = await createNote(ALICE, { tagIds: [exam] });

    const res = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ tagIds: [lab] });
    expect(res.body.tagIds).toEqual([lab]);
    expect((await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ tagIds: [] })).body.tagIds).toEqual([]);

    await share(note.id, BOB, "editor");
    expect((await as(BOB).patch(`/api/v1/notes/${note.id}`).send({ tagIds: [exam] })).status).toBe(403);
  });
});

describe("archive, pin and share", () => {
  it("sets explicit values, so repeating a request is harmless", async () => {
    const note = await createNote(ALICE);
    for (let i = 0; i < 2; i++) {
      const res = await as(ALICE)
        .patch(`/api/v1/notes/${note.id}`)
        .send({ isArchived: true, isPinned: true, isShared: true });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ isArchived: true, isPinned: true, isShared: true });
    }
    const res = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ isArchived: false });
    expect(res.body).toMatchObject({ isArchived: false, isPinned: true });
  });

  it("doesn't count as opening or editing the note", async () => {
    const note = await createNote(ALICE);
    await db.update(notes).set({ lastAccessedAt: new Date(0) }).where(eq(notes.id, note.id));
    const res = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ isPinned: true });
    expect(res.body).toMatchObject({ lastAccessedAt: 0, version: 0 });
  });

  it("is owner only", async () => {
    const note = await createNote(ALICE);
    await share(note.id, BOB, "editor");
    const res = await as(BOB).patch(`/api/v1/notes/${note.id}`).send({ isShared: true });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe("Only the note's owner can change isShared");
  });
});

describe("POST /api/v1/notes/:id/move", () => {
  it("files a quick note or sub-page in a folder as a top-level page", async () => {
    const { courseId, moduleId } = await aliceWithCourse();
    const parent = await createNote(ALICE);
    const child = await createNote(ALICE, { parentNoteId: parent.id });

    const res = await as(ALICE).post(`/api/v1/notes/${child.id}/move`).send({ courseId, moduleId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ noteType: "page", courseId, moduleId, parentNoteId: null });

    // Moving to just the course takes it out of the module.
    const back = await as(ALICE).post(`/api/v1/notes/${child.id}/move`).send({ courseId });
    expect(back.body).toMatchObject({ courseId, moduleId: null });
  });

  it("checks the folder and the caller", async () => {
    const { courseId } = await aliceWithCourse();
    const note = await createNote(ALICE);
    await share(note.id, BOB, "editor");
    expect((await as(ALICE).post(`/api/v1/notes/${note.id}/move`).send({})).status).toBe(400);
    expect((await as(ALICE).post(`/api/v1/notes/${note.id}/move`).send({ courseId: "nope" })).status).toBe(400);
    expect((await as(BOB).post(`/api/v1/notes/${note.id}/move`).send({ courseId })).status).toBe(403);
  });
});

describe("GET /api/v1/public/notes/:id", () => {
  it("serves a shared note to anyone, with only what the share page shows", async () => {
    const note = await createNote(ALICE, { content: "<p>Hello</p>", courseId: undefined });
    await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ isShared: true });

    const res = await request(app).get(`/api/v1/public/notes/${note.id}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(Object.keys(res.body).sort()).toEqual(
      ["content", "createdAt", "id", "outlineData", "outlineMetadata", "style", "title", "updatedAt"].sort(),
    );
    expect(res.body).toMatchObject({ title: "Mitosis", content: "<p>Hello</p>" });
  });

  it("404s once unshared, and for notes that were never shared or don't exist", async () => {
    const note = await createNote(ALICE);
    expect((await request(app).get(`/api/v1/public/notes/${note.id}`)).status).toBe(404);

    await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ isShared: true });
    await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ isShared: false });
    expect((await request(app).get(`/api/v1/public/notes/${note.id}`)).status).toBe(404);
    expect((await request(app).get("/api/v1/public/notes/nope")).status).toBe(404);
  });

  it("doesn't open up the rest of the API", async () => {
    expect((await request(app).get("/api/v1/public/../notes/recent")).status).toBe(401);
    expect((await request(app).get("/api/v1/notes/recent")).status).toBe(401);
  });
});

describe("note size limits", () => {
  it("saves a note bigger than the 1 MB limit other routes have", async () => {
    const note = await createNote(ALICE);
    // Quotes are escaped in JSON, so this is ~1.8 MB on the wire.
    const content = '<p class="x">'.repeat(115_000);
    const res = await as(ALICE).patch(`/api/v1/notes/${note.id}`).send({ content, version: 0 });
    expect(res.status).toBe(200);
    expect(res.body.content).toHaveLength(content.length);
  });

  it("refuses content over the per-note cap with a clear message", async () => {
    const note = await createNote(ALICE);
    const res = await as(ALICE)
      .patch(`/api/v1/notes/${note.id}`)
      .send({ content: "a".repeat(MAX_NOTE_CHARS + 1), version: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("This note is too large to save");
  });

  it("returns 413 for bodies over the notes limit", async () => {
    const note = await createNote(ALICE);
    const res = await as(ALICE)
      .patch(`/api/v1/notes/${note.id}`)
      .send({ content: "a".repeat(6_000_000), version: 0 });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("payload_too_large");
  });

  it("keeps the 1 MB limit everywhere else", async () => {
    const res = await as(ALICE).patch("/api/v1/users/me/preferences").send({ major: "a".repeat(1_100_000) });
    expect(res.status).toBe(413);
  });
});

describe("DELETE /api/v1/notes/:id", () => {
  it("is owner only, and turns sub-pages into top-level notes", async () => {
    const tag = await createTag(ALICE);
    const parent = await createNote(ALICE, { tagIds: [tag] });
    const child = await createNote(ALICE, { parentNoteId: parent.id });
    await share(parent.id, BOB, "editor");

    expect((await as(BOB).delete(`/api/v1/notes/${parent.id}`)).status).toBe(403);
    expect((await as(ALICE).delete(`/api/v1/notes/${parent.id}`)).status).toBe(204);

    expect((await as(ALICE).get(`/api/v1/notes/${parent.id}`)).status).toBe(404);
    expect((await as(ALICE).get(`/api/v1/notes/${child.id}`)).body.parentNoteId).toBeNull();
    expect(await db.select().from(noteTags)).toHaveLength(0);
    expect(await db.select().from(noteCollaborators)).toHaveLength(0);
  });
});

describe("POST /api/v1/notes/:id/touch", () => {
  it("marks the note opened without changing its version", async () => {
    const note = await createNote(ALICE);
    await db.update(notes).set({ lastAccessedAt: new Date(0) }).where(eq(notes.id, note.id));
    await share(note.id, BOB, "viewer");

    expect((await as(BOB).post(`/api/v1/notes/${note.id}/touch`)).status).toBe(204);
    const after = (await as(ALICE).get(`/api/v1/notes/${note.id}`)).body;
    expect(after.lastAccessedAt).toBeGreaterThan(Date.now() - 60_000);
    expect(after.version).toBe(0);
    expect((await as(CAROL).post(`/api/v1/notes/${note.id}/touch`)).status).toBe(404);
  });
});
