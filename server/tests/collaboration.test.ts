import { and, eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { noteCollaborators, noteInvites, notes, users } from "../src/db/schema/index.js";
import { MAX_PENDING_INVITES_PER_NOTE } from "../src/routes/collaboration.js";
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
const email = (user: string) => `${user}@example.test`;

async function createNote(user: string) {
  const res = await as(user).post("/api/v1/notes").send({ title: "Shared note" });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

describe("collaboration", () => {
  it("returns the caller's role on GET /notes/:id/access", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: await userId(BOB), role: "editor" });

    expect((await as(ALICE).get(`/api/v1/notes/${note.id}/access`)).body).toEqual({ role: "owner" });
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).body).toEqual({ role: "editor" });
    expect((await as(CAROL).get(`/api/v1/notes/${note.id}/access`)).status).toBe(404);
  });

  it("lists people with access and hides pending invites from collaborators", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteInvites).values({
      noteId: note.id,
      email: email(CAROL),
      role: "viewer",
      invitedBy: await userId(ALICE),
    });
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: await userId(BOB), role: "editor" });

    const ownerView = await as(ALICE).get(`/api/v1/notes/${note.id}/collaborators`);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.viewerRole).toBe("owner");
    expect(ownerView.body.owner.userId).toBe(await userId(ALICE));
    expect(ownerView.body.collaborators).toHaveLength(1);
    expect(ownerView.body.collaborators[0]).toMatchObject({ userId: await userId(BOB), role: "editor" });
    expect(ownerView.body.invites).toHaveLength(1);
    expect(ownerView.body.invites[0].email).toBe(email(CAROL));

    const collabView = await as(BOB).get(`/api/v1/notes/${note.id}/collaborators`);
    expect(collabView.body.viewerRole).toBe("editor");
    expect(collabView.body.invites).toEqual([]);
    expect((await as(CAROL).get(`/api/v1/notes/${note.id}/collaborators`)).status).toBe(404);
  });

  it("invites an existing user the same way as an unknown email, so accounts can't be probed", async () => {
    await userId(BOB);
    const note = await createNote(ALICE);
    const known = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: email(BOB), role: "editor" });
    const unknown = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: "nobody@example.test", role: "editor" });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(known.body).toEqual({ status: "invited", invited: true });

    // Not added behind Bob's back: he gets access when his app accepts the invite.
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).status).toBe(404);
    expect((await as(BOB).post("/api/v1/auth/accept-invites")).body).toEqual({ accepted: 1 });
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).body.role).toBe("editor");
  });

  it("changes the role of someone already on the note", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: await userId(BOB), role: "viewer" });
    const res = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: email(BOB).toUpperCase(), role: "editor" });
    expect(res.body).toEqual({ status: "updated", added: false });
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).body.role).toBe("editor");
  });

  it("recognises the owner inviting themselves", async () => {
    const note = await createNote(ALICE);
    const res = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: email(ALICE), role: "editor" });
    expect(res.body).toEqual({ status: "owner", added: false });
  });

  it("caps pending invites per note", async () => {
    const note = await createNote(ALICE);
    const aliceId = await userId(ALICE);
    await db.insert(noteInvites).values(
      Array.from({ length: MAX_PENDING_INVITES_PER_NOTE }, (_, i) => ({
        noteId: note.id,
        email: `person${i}@example.test`,
        role: "viewer" as const,
        invitedBy: aliceId,
      })),
    );
    const res = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: "one.more@example.test", role: "viewer" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("too_many_invites");

    // Re-sending an existing invite still works at the cap.
    const again = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: "person0@example.test", role: "editor" });
    expect(again.body).toEqual({ status: "invited", invited: true });
  });

  it("stores a pending invite for unknown emails", async () => {
    const note = await createNote(ALICE);
    const res = await as(ALICE)
      .post(`/api/v1/notes/${note.id}/collaborators/invite`)
      .send({ email: "new.person@example.test", role: "viewer" });
    expect(res.body).toEqual({ status: "invited", invited: true });

    const invites = await db.select().from(noteInvites).where(eq(noteInvites.noteId, note.id));
    expect(invites).toMatchObject([{ email: "new.person@example.test", role: "viewer" }]);
  });

  it("accepts pending invites on POST /auth/accept-invites", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteInvites).values({
      noteId: note.id,
      email: email(BOB),
      role: "viewer",
      invitedBy: await userId(ALICE),
    });

    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).status).toBe(404);
    const accepted = await as(BOB).post("/api/v1/auth/accept-invites");
    expect(accepted.body).toEqual({ accepted: 1 });
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).body.role).toBe("viewer");
  });

  it("lets the owner remove collaborators and revoke invites", async () => {
    const note = await createNote(ALICE);
    const bobId = await userId(BOB);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: bobId, role: "viewer" });
    await db.insert(noteInvites).values({
      noteId: note.id,
      email: email(CAROL),
      role: "viewer",
      invitedBy: await userId(ALICE),
    });

    expect((await as(ALICE).delete(`/api/v1/notes/${note.id}/collaborators/${bobId}`)).body.removed).toBe(true);
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).status).toBe(404);

    const revoked = await as(ALICE).delete(`/api/v1/notes/${note.id}/invites`).send({ email: email(CAROL) });
    expect(revoked.body.revoked).toBe(true);
    expect(
      await db.select().from(noteInvites).where(and(eq(noteInvites.noteId, note.id), eq(noteInvites.email, email(CAROL)))),
    ).toHaveLength(0);
  });

  it("lets the owner change collaborator roles", async () => {
    const note = await createNote(ALICE);
    const bobId = await userId(BOB);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: bobId, role: "viewer" });

    const res = await as(ALICE)
      .patch(`/api/v1/notes/${note.id}/collaborators/${bobId}`)
      .send({ role: "editor" });
    expect(res.body).toEqual({ updated: true });
    expect((await as(BOB).get(`/api/v1/notes/${note.id}/access`)).body.role).toBe("editor");
    expect((await as(BOB).patch(`/api/v1/notes/${note.id}`).send({ title: "Edited" })).status).toBe(200);
  });

  it("blocks non-owners from managing collaborators", async () => {
    const note = await createNote(ALICE);
    await db.insert(noteCollaborators).values({ noteId: note.id, userId: await userId(BOB), role: "editor" });

    expect(
      (await as(BOB)
        .post(`/api/v1/notes/${note.id}/collaborators/invite`)
        .send({ email: email(CAROL), role: "viewer" })).status,
    ).toBe(403);
  });
});
