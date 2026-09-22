import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import { documents, files, users } from "../src/db/schema/index.js";
import { buildApp, createTestDb, fakeStorage } from "./helpers.js";

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: (req: Request) => ({ userId: req.header("x-test-user") ?? null }),
}));

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
  await db.delete(users); // cascades to files and everything else
  fake = fakeStorage();
  app = buildApp({ storage: fake.storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("x-test-user", user),
  post: (path: string) => request(app).post(path).set("x-test-user", user),
  patch: (path: string) => request(app).patch(path).set("x-test-user", user),
  delete: (path: string) => request(app).delete(path).set("x-test-user", user),
});

/** The full client flow: ask for a signed URL, "PUT" the bytes, then record the file. */
async function uploadPdf(user: string, name = "Lecture 1.pdf", courseId?: string) {
  const signed = await as(user)
    .post("/api/v1/uploads")
    .send({ filename: name, contentType: "application/pdf", size: 2048 });
  expect(signed.status).toBe(201);
  fake.objects.set(signed.body.key, { size: 2048, contentType: "application/pdf" });

  const created = await as(user)
    .post("/api/v1/files")
    .send({ name, type: "pdf", storageKey: signed.body.key, courseId });
  expect(created.status).toBe(201);
  return created.body;
}

describe("users", () => {
  it("creates the users row on first request and reuses it after", async () => {
    const first = await as(ALICE).get("/api/v1/me");
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ clerkUserId: ALICE, email: `${ALICE}@example.test` });

    const second = await as(ALICE).get("/api/v1/me");
    expect(second.body.id).toBe(first.body.id);
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("survives concurrent first requests", async () => {
    const results = await Promise.all([1, 2, 3].map(() => as(BOB).get("/api/v1/me")));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
  });

  it("sends dates as ms timestamps, like Convex did", async () => {
    const res = await as(ALICE).get("/api/v1/me");
    expect(typeof res.body.createdAt).toBe("number");
    expect(Math.abs(res.body.createdAt - Date.now())).toBeLessThan(60_000);
  });
});

describe("POST /api/v1/files", () => {
  it("records an uploaded file in Postgres and returns it with a signed link", async () => {
    const file = await uploadPdf(ALICE, "Lecture 1.pdf", "course-bio");

    expect(file).toMatchObject({
      name: "Lecture 1.pdf",
      type: "pdf",
      courseId: "course-bio",
      contentType: "application/pdf",
      sizeBytes: 2048,
      processingStatus: "pending",
    });
    expect(file.url).toBe(`https://bucket.test/${file.storageKey}?signed-get`);
    expect(file).not.toHaveProperty("embedding");

    const [row] = await db.select().from(files).where(eq(files.id, file.id));
    expect(row.storageKey).toBe(file.storageKey);
    const [alice] = await db.select().from(users).where(eq(users.clerkUserId, ALICE));
    expect(row.userId).toBe(alice.id);
  });

  it("records external links without touching storage", async () => {
    const res = await as(ALICE)
      .post("/api/v1/files")
      .send({ name: "Khan Academy", type: "link", url: "https://khanacademy.org/x" });
    expect(res.status).toBe(201);
    expect(res.body.url).toBe("https://khanacademy.org/x");
    expect(res.body.processingStatus).toBeNull();
    expect(fake.mock.stat).not.toHaveBeenCalled();
  });

  it("refuses to record a file that never reached the bucket", async () => {
    const res = await as(ALICE)
      .post("/api/v1/files")
      .send({ name: "ghost.pdf", type: "pdf", storageKey: `users/${ALICE}/abc/ghost.pdf` });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("upload_missing");
    expect(await db.select().from(files)).toHaveLength(0);
  });

  it("refuses to claim someone else's upload", async () => {
    const bobKey = `users/${BOB}/abc/secret.pdf`;
    fake.objects.set(bobKey, { size: 1, contentType: "application/pdf" });
    const res = await as(ALICE)
      .post("/api/v1/files")
      .send({ name: "mine now.pdf", type: "pdf", storageKey: bobKey });
    expect(res.status).toBe(404);
  });

  it("requires exactly one of url or storageKey", async () => {
    for (const body of [
      { name: "x", type: "pdf" },
      { name: "x", type: "pdf", url: "https://a.test", storageKey: `users/${ALICE}/a/b` },
      { name: "x", type: "link", url: "javascript:alert(1)" },
    ]) {
      const res = await as(ALICE).post("/api/v1/files").send(body);
      expect(res.status).toBe(400);
    }
  });
});

describe("reading files", () => {
  it("lists the caller's recent files newest first, with fresh links", async () => {
    const a = await uploadPdf(ALICE, "a.pdf");
    const b = await uploadPdf(ALICE, "b.pdf");
    await uploadPdf(BOB, "bob.pdf");

    const res = await as(ALICE).get("/api/v1/files");
    expect(res.status).toBe(200);
    expect(res.body.map((f: { id: string }) => f.id)).toEqual([b.id, a.id]);
    expect(res.body[0].url).toContain("signed-get");
    expect(res.body[0]).not.toHaveProperty("extractedText");
  });

  it("filters by course", async () => {
    await uploadPdf(ALICE, "bio.pdf", "bio");
    await uploadPdf(ALICE, "chem.pdf", "chem");
    const res = await as(ALICE).get("/api/v1/files").query({ courseId: "bio" });
    expect(res.body.map((f: { name: string }) => f.name)).toEqual(["bio.pdf"]);
  });

  it("gets one file, its status, and pending files", async () => {
    const file = await uploadPdf(ALICE);
    expect((await as(ALICE).get(`/api/v1/files/${file.id}`)).body.url).toContain(file.storageKey);
    expect((await as(ALICE).get(`/api/v1/files/${file.id}/status`)).body).toMatchObject({
      fileId: file.id,
      status: "pending",
    });
    const pending = await as(ALICE).get("/api/v1/files/pending");
    expect(pending.body.map((f: { id: string }) => f.id)).toEqual([file.id]);
  });

  it("hides other users' files behind a 404", async () => {
    const file = await uploadPdf(ALICE);
    for (const res of [
      await as(BOB).get(`/api/v1/files/${file.id}`),
      await as(BOB).get(`/api/v1/files/${file.id}/status`),
      await as(BOB).patch(`/api/v1/files/${file.id}`).send({ name: "pwned" }),
      await as(BOB).delete(`/api/v1/files/${file.id}`),
    ]) {
      expect(res.status).toBe(404);
    }
    expect(fake.objects.has(file.storageKey)).toBe(true);
  });
});

describe("changing files", () => {
  it("renames, touches and retries", async () => {
    const file = await uploadPdf(ALICE);

    const renamed = await as(ALICE).patch(`/api/v1/files/${file.id}`).send({ name: "Week 1.pdf" });
    expect(renamed.body.name).toBe("Week 1.pdf");

    expect((await as(ALICE).post(`/api/v1/files/${file.id}/touch`)).status).toBe(204);

    await db.update(files).set({ processingStatus: "error", errorMessage: "boom" });
    expect((await as(ALICE).post(`/api/v1/files/${file.id}/retry`)).status).toBe(204);
    const [row] = await db.select().from(files).where(eq(files.id, file.id));
    expect(row).toMatchObject({ processingStatus: "pending", errorMessage: null, progressPercent: 0 });
  });

  it("deletes the row, its document chunks, and the object in the bucket", async () => {
    const file = await uploadPdf(ALICE);
    await db.insert(documents).values({
      storageKey: file.storageKey,
      courseId: "bio",
      text: "chunk",
      embedding: Array(768).fill(0),
    });

    const res = await as(ALICE).delete(`/api/v1/files/${file.id}`);
    expect(res.status).toBe(204);
    expect(await db.select().from(files)).toHaveLength(0);
    expect(await db.select().from(documents)).toHaveLength(0);
    expect(fake.mock.delete).toHaveBeenCalledWith(file.storageKey);
    expect(fake.objects.has(file.storageKey)).toBe(false);
  });

  it("still deletes the row if the bucket delete fails", async () => {
    const file = await uploadPdf(ALICE);
    fake.mock.delete.mockRejectedValueOnce(new Error("bucket down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect((await as(ALICE).delete(`/api/v1/files/${file.id}`)).status).toBe(204);
    expect(await db.select().from(files)).toHaveLength(0);
  });
});
