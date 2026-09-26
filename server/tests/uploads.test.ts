import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { createStorage, isOwnedKey, newObjectKey } from "../src/storage/s3.js";
import { bearer, buildApp, createTestDb, fakeStorage, testEnv } from "./helpers.js";

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
      .set("Authorization", bearer(ALICE))
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
      .set("Authorization", bearer(ALICE))
      .send({ filename: "huge.mp4", contentType: "video/mp4", size: 11 * 1024 * 1024 });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("file_too_large");
    expect(fake.mock.createUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["application/x-msdownload", "setup.exe"],
    ["text/html", "page.html"],
    ["image/svg+xml; charset=utf-8", "x.svg"],
    ["image/svg+xml", "diagram.svg"],
    ["IMAGE/SVG+XML", "diagram.svg"],
  ])("rejects unsupported type %s", async (contentType, filename) => {
    const res = await request(app)
      .post("/api/v1/uploads")
      .set("Authorization", bearer(ALICE))
      .send({ filename, contentType, size: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_request");
  });

  it("rejects a missing or non-integer size", async () => {
    for (const size of [undefined, 0, -1, 1.5, "10"]) {
      const res = await request(app)
        .post("/api/v1/uploads")
        .set("Authorization", bearer(ALICE))
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
      .set("Authorization", bearer(ALICE));
    expect(stat.status).toBe(200);
    expect(stat.body).toEqual({ key: aliceKey, size: 42, contentType: "application/pdf" });

    const dl = await request(app)
      .get("/api/v1/uploads/download-url")
      .query({ key: aliceKey })
      .set("Authorization", bearer(ALICE));
    expect(dl.status).toBe(200);
    expect(dl.body.url).toContain("signed-get");

    const del = await request(app)
      .delete("/api/v1/uploads")
      .query({ key: aliceKey })
      .set("Authorization", bearer(ALICE));
    expect(del.status).toBe(204);
    expect(fake.objects.has(aliceKey)).toBe(false);
  });

  it("hides other users' files behind a 404", async () => {
    for (const [method, path] of [
      ["get", "/api/v1/uploads/stat"],
      ["get", "/api/v1/uploads/download-url"],
      ["delete", "/api/v1/uploads"],
    ] as const) {
      const res = await request(app)[method](path).query({ key: aliceKey }).set("Authorization", bearer(BOB));
      expect(res.status).toBe(404);
    }
    expect(fake.mock.createDownloadUrl).not.toHaveBeenCalled();
    expect(fake.mock.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the upload never landed", async () => {
    const res = await request(app)
      .get("/api/v1/uploads/stat")
      .query({ key: `users/${ALICE}/missing/file.pdf` })
      .set("Authorization", bearer(ALICE));
    expect(res.status).toBe(404);
  });

  it("requires a key", async () => {
    const res = await request(app).get("/api/v1/uploads/stat").set("Authorization", bearer(ALICE));
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

describe("download links", () => {
  // Signing is local: no request reaches the (made-up) endpoint.
  const storage = createStorage({
    endpoint: "https://storage.example.test",
    region: "auto",
    bucket: "test-bucket",
    accessKeyId: "test",
    secretAccessKey: "test",
  });
  const dispositionOf = (url: string) => new URL(url).searchParams.get("response-content-disposition");

  it("shows ordinary files inline", async () => {
    expect(dispositionOf(await storage.createDownloadUrl(`users/${ALICE}/x/notes.pdf`, "notes.pdf"))).toMatch(
      /^inline;/,
    );
  });

  it.each([
    [`users/${ALICE}/x/diagram.svg`, "diagram.svg"],
    [`users/${ALICE}/x/file`, "page.HTML"],
    [`users/${ALICE}/x/old.svg`, undefined],
  ])("forces a download for %s (%s), which could run script inline", async (key, filename) => {
    expect(dispositionOf(await storage.createDownloadUrl(key, filename))).toMatch(/^attachment/);
  });
});

describe("daily upload allowance", () => {
  const sign = (user: string, size: number) =>
    request(app)
      .post("/api/v1/uploads")
      .set("Authorization", bearer(user))
      .send({ filename: "notes.pdf", contentType: "application/pdf", size });

  beforeEach(() => {
    app = buildApp({ storage: fake.storage, db, env: { ...testEnv, UPLOAD_BYTES_PER_DAY: 3000 } });
  });

  it("stops signing uploads once the day's bytes are used, per user", async () => {
    expect((await sign(`${ALICE}_quota`, 2000)).status).toBe(201);
    const refused = await sign(`${ALICE}_quota`, 1001);
    expect(refused.status).toBe(429);
    expect(refused.body.error.code).toBe("upload_quota_exceeded");
    // What's left can still be used, and other users are unaffected.
    expect((await sign(`${ALICE}_quota`, 1000)).status).toBe(201);
    expect((await sign(`${BOB}_quota`, 3000)).status).toBe(201);
  });

  it("can't be overshot by parallel requests", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => sign(`${ALICE}_parallel`, 1000)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 429)).toHaveLength(3);
  });
});

describe("total storage limit", () => {
  const GB = 1024 ** 3;
  const sign = (user: string, size: number) =>
    request(app)
      .post("/api/v1/uploads")
      .set("Authorization", bearer(user))
      .send({ filename: "lecture.webm", contentType: "audio/webm", size });

  beforeEach(() => {
    // Big per-file and per-day caps, so only the storage limit is in play.
    app = buildApp({ storage: fake.storage, db, env: { ...testEnv, MAX_UPLOAD_BYTES: 2 * GB, UPLOAD_BYTES_PER_DAY: 10 * GB } });
  });

  it("refuses an upload that would pass the plan's storage, counting what's already stored", async () => {
    const user = `${ALICE}_storage`;
    fake.objects.set(`users/${user}/old/lecture.webm`, { size: GB - 1000, contentType: "audio/webm" });
    fake.objects.set(`users/${BOB}/old/lecture.webm`, { size: GB, contentType: "audio/webm" });

    const refused = await sign(user, 1001);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("storage_limit_reached");
    expect(refused.body.error.message).toMatch(/1 GB of storage/);
    expect((await sign(user, 1000)).status).toBe(201);
  });

  it("doesn't spend the daily allowance on a refused upload", async () => {
    app = buildApp({ storage: fake.storage, db, env: { ...testEnv, MAX_UPLOAD_BYTES: 2 * GB, UPLOAD_BYTES_PER_DAY: 3000 } });
    const user = `${ALICE}_storage_day`;
    fake.objects.set(`users/${user}/old/lecture.webm`, { size: GB, contentType: "audio/webm" });
    expect((await sign(user, 2000)).status).toBe(403);
    fake.objects.clear();
    expect((await sign(user, 3000)).status).toBe(201);
  });
});
