import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import { isOwnedKey, newObjectKey } from "../src/storage/s3.js";
import { buildApp, createTestDb, fakeStorage } from "./helpers.js";

// Stand in for Clerk: the `x-test-user` header is the signed-in user id.
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

beforeEach(() => {
  fake = fakeStorage();
  app = buildApp({ storage: fake.storage, db });
});

describe("POST /api/v1/uploads", () => {
  it("signs an upload under the caller's own prefix", async () => {
    const res = await request(app)
      .post("/api/v1/uploads")
      .set("x-test-user", ALICE)
      .send({ filename: "Lecture 3 (final).pdf", contentType: "application/pdf", size: 1234 });

    expect(res.status).toBe(201);
    expect(res.body.method).toBe("PUT");
    expect(res.body.key).toMatch(/^users\/user_alice\/[0-9a-f-]{36}\/Lecture-3-final\.pdf$/);
    expect(res.body.headers).toEqual({ "Content-Type": "application/pdf" });
    expect(fake.mock.createUploadUrl).toHaveBeenCalledWith(res.body.key, "application/pdf", 1234);
  });

  it("rejects files over the size limit", async () => {
    const res = await request(app)
      .post("/api/v1/uploads")
      .set("x-test-user", ALICE)
      .send({ filename: "huge.mp4", contentType: "video/mp4", size: 11 * 1024 * 1024 });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("file_too_large");
    expect(fake.mock.createUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["application/x-msdownload", "setup.exe"],
    ["text/html", "page.html"],
    ["image/svg+xml; charset=utf-8", "x.svg"],
  ])("rejects unsupported type %s", async (contentType, filename) => {
    const res = await request(app)
      .post("/api/v1/uploads")
      .set("x-test-user", ALICE)
      .send({ filename, contentType, size: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_request");
  });

  it("rejects a missing or non-integer size", async () => {
    for (const size of [undefined, 0, -1, 1.5, "10"]) {
      const res = await request(app)
        .post("/api/v1/uploads")
        .set("x-test-user", ALICE)
        .send({ filename: "a.pdf", contentType: "application/pdf", size });
      expect(res.status).toBe(400);
    }
  });
});

describe("reading and deleting uploads", () => {
  const aliceKey = `users/${ALICE}/0b7c1f7e-0000-4000-8000-000000000000/notes.pdf`;

  beforeEach(() => {
    fake.objects.set(aliceKey, { size: 42, contentType: "application/pdf" });
  });

  it("lets the owner stat, download and delete", async () => {
    const stat = await request(app)
      .get("/api/v1/uploads/stat")
      .query({ key: aliceKey })
      .set("x-test-user", ALICE);
    expect(stat.status).toBe(200);
    expect(stat.body).toEqual({ key: aliceKey, size: 42, contentType: "application/pdf" });

    const dl = await request(app)
      .get("/api/v1/uploads/download-url")
      .query({ key: aliceKey })
      .set("x-test-user", ALICE);
    expect(dl.status).toBe(200);
    expect(dl.body.url).toContain("signed-get");

    const del = await request(app)
      .delete("/api/v1/uploads")
      .query({ key: aliceKey })
      .set("x-test-user", ALICE);
    expect(del.status).toBe(204);
    expect(fake.objects.has(aliceKey)).toBe(false);
  });

  it("hides other users' files behind a 404", async () => {
    for (const [method, path] of [
      ["get", "/api/v1/uploads/stat"],
      ["get", "/api/v1/uploads/download-url"],
      ["delete", "/api/v1/uploads"],
    ] as const) {
      const res = await request(app)[method](path).query({ key: aliceKey }).set("x-test-user", BOB);
      expect(res.status).toBe(404);
    }
    expect(fake.mock.createDownloadUrl).not.toHaveBeenCalled();
    expect(fake.mock.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the upload never landed", async () => {
    const res = await request(app)
      .get("/api/v1/uploads/stat")
      .query({ key: `users/${ALICE}/missing/file.pdf` })
      .set("x-test-user", ALICE);
    expect(res.status).toBe(404);
  });

  it("requires a key", async () => {
    const res = await request(app).get("/api/v1/uploads/stat").set("x-test-user", ALICE);
    expect(res.status).toBe(400);
  });
});

describe("object keys", () => {
  it("strips path tricks and odd characters from filenames", () => {
    const key = newObjectKey(ALICE, "../../etc/passwd");
    expect(key).toMatch(/^users\/user_alice\/[0-9a-f-]{36}\/etcpasswd$/);
    expect(newObjectKey(ALICE, "???")).toMatch(/\/file$/);
    expect(newObjectKey(ALICE, "notes..v2...pdf")).toMatch(/\/notes\.v2\.pdf$/);
    expect(newObjectKey(ALICE, ".env")).toMatch(/\/env$/);
  });

  it("keeps every generated key usable by its owner", () => {
    for (const name of ["../../etc/passwd", "..", "a..b", "résumé final.pdf", "x".repeat(300)]) {
      expect(isOwnedKey(ALICE, newObjectKey(ALICE, name))).toBe(true);
    }
  });

  it("only treats keys under the user's prefix as owned", () => {
    expect(isOwnedKey(ALICE, `users/${ALICE}/x/a.pdf`)).toBe(true);
    expect(isOwnedKey(ALICE, `users/${ALICE}_evil/x/a.pdf`)).toBe(false);
    expect(isOwnedKey(ALICE, `users/${ALICE}/../${BOB}/a.pdf`)).toBe(false);
    expect(isOwnedKey(ALICE, `users/${BOB}/x/a.pdf`)).toBe(false);
  });
});
