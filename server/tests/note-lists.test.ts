import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { noteCollaborators, notes, noteTags, tags, users } from "../src/db/schema/index.js";
import { toPreview } from "../src/routes/note-lists.js";
import { bearer, buildApp, createTestDb } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";
const CAROL = "user_carol";
const HOUR = 60 * 60 * 1000;

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;
let ids: Record<string, string>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  app = buildApp({ db });
  ids = {};
  for (const user of [ALICE, BOB, CAROL]) {
    ids[user] = (await as(user).get("/api/v1/users/me")).body.id;
  }
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
});

/** Inserts a note directly, `ageHours` old. */
async function note(user: string, title: string, fields: Partial<typeof notes.$inferInsert> = {}, ageHours = 0) {
  const createdAt = new Date(Date.now() - ageHours * HOUR);
  const [row] = await db
    .insert(notes)
    .values({ userId: ids[user], title, createdAt, lastAccessedAt: createdAt, ...fields })
    .returning();
  return row;
}

const titles = (res: request.Response) => res.body.map((n: { title: string }) => n.title);

describe("list shape", () => {
  it("sends a preview and outline flag instead of the note body", async () => {
    await note(ALICE, "Cells", {
      content: "<h1>Cell &amp; biology</h1><p>The   cell is the <b>basic</b> unit.</p>",
      outlineData: '{"root":[]}',
      embedding: Array(768).fill(0),
    });
    const [item] = (await as(ALICE).get("/api/v1/notes/recent")).body;
    expect(item).toMatchObject({ title: "Cells", preview: "Cell & biology The cell is the basic unit.", hasOutline: true });
    for (const hidden of ["content", "outlineData", "contentHead", "embedding", "searchTitle", "searchContent"]) {
      expect(item).not.toHaveProperty(hidden);
    }
  });

  it("cuts previews short and copes with a tag cut in half", () => {
    expect(toPreview("<p>" + "word ".repeat(100) + "</p>")).toHaveLength(200);
    expect(toPreview('<p>Hello</p><img src="https://exam')).toBe("Hello");
    expect(toPreview(null)).toBe("");
  });

  it("flags an empty outline as no outline", async () => {
    await note(ALICE, "Blank", { outlineData: "   " });
    expect((await as(ALICE).get("/api/v1/notes/recent")).body[0].hasOutline).toBe(false);
  });
});

describe("GET /api/v1/notes/quick", () => {
  it("lists unfiled top-level notes, newest first, including shared ones", async () => {
    const parent = await note(ALICE, "Quick", { noteType: "quick" }, 3);
    await note(ALICE, "Legacy untyped", {}, 2);
    await note(ALICE, "Page", { noteType: "page", courseId: "c1" }, 1);
    await note(ALICE, "Untyped but filed", { courseId: "c1" }, 1);
    await note(ALICE, "Child", { noteType: "quick", parentNoteId: parent.id });
    await note(ALICE, "Archived", { noteType: "quick", isArchived: true });
    const shared = await note(BOB, "Bob's shared", { noteType: "quick" }, 2.5);
    await note(BOB, "Bob's private", { noteType: "quick" });
    await db.insert(noteCollaborators).values({ noteId: shared.id, userId: ids[ALICE], role: "viewer" });

    const res = await as(ALICE).get("/api/v1/notes/quick");
    expect(titles(res)).toEqual(["Legacy untyped", "Bob's shared", "Quick"]);
  });

  it("stops at the limit", async () => {
    for (let i = 0; i < 12; i++) await note(ALICE, `n${i}`, { noteType: "quick" }, i);
    expect((await as(ALICE).get("/api/v1/notes/quick")).body).toHaveLength(10);
    expect((await as(ALICE).get("/api/v1/notes/quick?limit=3")).body).toHaveLength(3);
    expect((await as(ALICE).get("/api/v1/notes/quick?limit=0")).status).toBe(400);
  });
});

describe("GET /api/v1/notes/recent", () => {
  it("lists the newest five of any kind, including shared, excluding archived", async () => {
    for (let i = 0; i < 6; i++) await note(ALICE, `a${i}`, { noteType: "page" }, i + 1);
    await note(ALICE, "archived", { isArchived: true });
    const shared = await note(BOB, "shared", {}, 0.5);
    await db.insert(noteCollaborators).values({ noteId: shared.id, userId: ids[ALICE], role: "editor" });

    expect(titles(await as(ALICE).get("/api/v1/notes/recent"))).toEqual(["shared", "a0", "a1", "a2", "a3"]);
  });
});

describe("GET /api/v1/notes/archived and /pinned", () => {
  it("lists the caller's own archived notes", async () => {
    await note(ALICE, "old", { isArchived: true }, 2);
    await note(ALICE, "older", { isArchived: true }, 5);
    await note(ALICE, "live");
    await note(BOB, "bob's", { isArchived: true });
    expect(titles(await as(ALICE).get("/api/v1/notes/archived"))).toEqual(["old", "older"]);
  });

  it("lists pinned notes that aren't archived", async () => {
    await note(ALICE, "pinned", { isPinned: true });
    await note(ALICE, "pinned but archived", { isPinned: true, isArchived: true });
    await note(ALICE, "unpinned");
    expect(titles(await as(ALICE).get("/api/v1/notes/pinned"))).toEqual(["pinned"]);
  });
});

describe("GET /api/v1/notes (filters)", () => {
  it("lists a course's or module's top-level notes, oldest first", async () => {
    const intro = await note(ALICE, "Intro", { courseId: "c1" }, 3);
    await note(ALICE, "Week 1", { courseId: "c1", moduleId: "m1" }, 2);
    await note(ALICE, "Sub-page", { courseId: "c1", parentNoteId: intro.id }, 1);
    await note(ALICE, "Other course", { courseId: "c2" });
    await note(BOB, "Bob's c1", { courseId: "c1" });

    expect(titles(await as(ALICE).get("/api/v1/notes?courseId=c1"))).toEqual(["Intro", "Week 1"]);
    expect(titles(await as(ALICE).get("/api/v1/notes?moduleId=m1"))).toEqual(["Week 1"]);
  });

  it("lists top-level notes carrying a tag", async () => {
    const [tag] = await db.insert(tags).values({ userId: ids[ALICE], name: "exam", color: "red" }).returning();
    const tagged = await note(ALICE, "Tagged", {}, 1);
    const child = await note(ALICE, "Tagged child", { parentNoteId: tagged.id });
    await note(ALICE, "Untagged");
    await db.insert(noteTags).values([
      { noteId: tagged.id, tagId: tag.id },
      { noteId: child.id, tagId: tag.id },
    ]);

    expect(titles(await as(ALICE).get(`/api/v1/notes?tagId=${tag.id}`))).toEqual(["Tagged"]);
    expect((await as(BOB).get(`/api/v1/notes?tagId=${tag.id}`)).body).toEqual([]);
  });

  it("needs a filter", async () => {
    expect((await as(ALICE).get("/api/v1/notes")).status).toBe(400);
  });
});

describe("GET /api/v1/notes/:id/children", () => {
  it("lists the sub-pages the caller can see, newest first", async () => {
    const parent = await note(ALICE, "Parent");
    await note(ALICE, "Older child", { parentNoteId: parent.id }, 2);
    await note(ALICE, "Newer child", { parentNoteId: parent.id }, 1);
    // An editor's own page under a shared parent (from before sub-pages went to the owner).
    await note(BOB, "Bob's child", { parentNoteId: parent.id });
    await db.insert(noteCollaborators).values({ noteId: parent.id, userId: ids[CAROL], role: "viewer" });

    expect(titles(await as(ALICE).get(`/api/v1/notes/${parent.id}/children`))).toEqual(["Newer child", "Older child"]);
    // Carol can see the parent but none of its (unshared) children.
    expect((await as(CAROL).get(`/api/v1/notes/${parent.id}/children`)).body).toEqual([]);
    expect((await as(BOB).get(`/api/v1/notes/${parent.id}/children`)).status).toBe(404);
  });
});

describe("GET /api/v1/notes/search", () => {
  it("returns the caller's newest notes, excluding archived, with tagIds", async () => {
    await note(ALICE, "Live", {}, 1);
    await note(ALICE, "Newer", {}, 0.5);
    await note(ALICE, "Archived", { isArchived: true });
    const shared = await note(BOB, "Bob's note");
    await db.insert(noteCollaborators).values({ noteId: shared.id, userId: ids[ALICE], role: "viewer" });

    const [examTag] = await db.insert(tags).values({ userId: ids[ALICE], name: "exam", color: "red" }).returning();
    const tagged = await note(ALICE, "Tagged", {}, 2);
    await db.insert(noteTags).values({ noteId: tagged.id, tagId: examTag.id });

    const res = await as(ALICE).get("/api/v1/notes/search");
    expect(res.body.map((n: { title: string }) => n.title)).toEqual(["Newer", "Live", "Tagged"]);
    expect(res.body[0]).toHaveProperty("content");
    expect(res.body[0]).toHaveProperty("tagIds");
    expect(res.body[0]).not.toHaveProperty("preview");
    expect(res.body.find((n: { title: string }) => n.title === "Tagged").tagIds).toEqual([examTag.id]);
  });

  it("searches titles and filters by noteType, courseId, and tag intersection", async () => {
    const [examTag] = await db.insert(tags).values({ userId: ids[ALICE], name: "exam", color: "red" }).returning();
    const [labTag] = await db.insert(tags).values({ userId: ids[ALICE], name: "lab", color: "blue" }).returning();

    const mitosis = await note(ALICE, "Mitosis lecture", { noteType: "page", courseId: "bio" }, 3);
    await note(ALICE, "Shopping list", { noteType: "quick" }, 2);
    const labNote = await note(ALICE, "Lab prep", { noteType: "page", courseId: "bio" }, 1);
    await db.insert(noteTags).values([
      { noteId: mitosis.id, tagId: examTag.id },
      { noteId: mitosis.id, tagId: labTag.id },
      { noteId: labNote.id, tagId: labTag.id },
    ]);

    expect(
      (await as(ALICE).get("/api/v1/notes/search?query=mitosis")).body.map((n: { title: string }) => n.title),
    ).toEqual(["Mitosis lecture"]);

    expect(
      (await as(ALICE).get("/api/v1/notes/search?noteType=page&courseId=bio")).body.map(
        (n: { title: string }) => n.title,
      ),
    ).toEqual(["Lab prep", "Mitosis lecture"]);

    expect(
      (await as(ALICE).get(`/api/v1/notes/search?tagIds=${examTag.id},${labTag.id}`)).body.map(
        (n: { title: string }) => n.title,
      ),
    ).toEqual(["Mitosis lecture"]);
  });
});

describe("GET /api/v1/notes/resume-target", () => {
  it("opens the most recently opened note", async () => {
    const opened = await note(ALICE, "Opened", { lastAccessedAt: new Date(Date.now() - HOUR) }, 48);
    await note(ALICE, "Created later, never opened", { lastAccessedAt: null }, 10);
    await note(ALICE, "Archived", { isArchived: true, lastAccessedAt: new Date() });

    expect((await as(ALICE).get("/api/v1/notes/resume-target")).body).toEqual({ target: "note", noteId: opened.id });
  });

  it("falls back to creation time for notes never opened", async () => {
    const fresh = await note(ALICE, "Fresh", { lastAccessedAt: null }, 1);
    expect((await as(ALICE).get("/api/v1/notes/resume-target")).body).toEqual({ target: "note", noteId: fresh.id });
  });

  it("goes home with no notes, or when the last one is days old", async () => {
    expect((await as(ALICE).get("/api/v1/notes/resume-target")).body).toEqual({ target: "home" });
    await note(ALICE, "Stale", {}, 4 * 24);
    expect((await as(ALICE).get("/api/v1/notes/resume-target")).body).toEqual({ target: "home" });
  });
});
