import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import { deadlines, lmsConnections, lmsCourseLinks, users } from "../src/db/schema/index.js";
import { type FeedFetcher } from "../src/integrations/brightspace/sync.js";
import { matchCourse, parseCourseName } from "../src/integrations/brightspace/courses.js";
import { createSecretBox } from "../src/integrations/secretBox.js";
import { syncBrightspaceFeeds } from "../src/workers/jobs/brightspaceSync.js";
import { bearer, buildApp, createTestDb, testEnv } from "./helpers.js";

const KEY = randomBytes(32).toString("base64");
const env = { ...testEnv, LMS_ENCRYPTION_KEY: KEY };
const FEED = "https://school.brightspace.com/d2l/le/calendar/feed/user/feed.ics?token=secret-token";
const ALICE = "user_alice";
const BOB = "user_bob";

// Far enough ahead that the parser's window keeps them whenever tests run.
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const calendar = (...events: Array<{ uid: string; summary: string; days: number; location: string; ou: string }>) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `SUMMARY:${e.summary}`,
      `DTSTART:${inDays(e.days)}`,
      `LOCATION:${e.location}`,
      `URL:https://school.brightspace.com/d2l/le/calendar/${e.ou}/event/1/detailsview`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");

const essay = { uid: "essay@d2l", summary: "Essay 1 - Due", days: 7, location: "HIST101 - History of Africa", ou: "111" };
const quiz = { uid: "quiz@d2l", summary: "Quiz 2 - Availability Ends", days: 9, location: "MATH201 - Calculus", ou: "222" };

let db: Db;
let closeDb: () => Promise<void>;
let feed: string;
let fetcher: ReturnType<typeof vi.fn<FeedFetcher>>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  feed = calendar(essay, quiz);
  fetcher = vi.fn<FeedFetcher>(async () => feed);
  app = buildApp({ db, env, feedFetcher: fetcher });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
  put: (path: string) => request(app).put(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});
const BASE = "/api/v1/integrations/brightspace";

/** Gives the user Lumina courses to map onto. */
async function withCourses(user: string) {
  await as(user).get("/api/v1/users/me");
  await db
    .update(users)
    .set({
      courses: [
        { id: "c-hist", name: "History", code: "HIST 101" },
        { id: "c-math", name: "Maths", code: "MATH201" },
      ],
    })
    .where(eq(users.clerkUserId, user));
}

describe("Brightspace routes", () => {
  it("reports not connected", async () => {
    const res = await as(ALICE).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: false });
  });

  it("connects: validates the feed, stores it sealed, syncs, and pre-maps courses by code", async () => {
    await withCourses(ALICE);
    const res = await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      connected: true,
      kind: "ical",
      host: "school.brightspace.com",
      status: "active",
      deadlineCount: 2,
      sync: { ok: true, added: 2 },
    });
    expect(res.body.courses).toEqual([
      { id: expect.any(String), name: "HIST101 - History of Africa", courseId: "c-hist", ignored: false },
      { id: expect.any(String), name: "MATH201 - Calculus", courseId: "c-math", ignored: false },
    ]);
    // The link is a secret: sealed at rest, never echoed back.
    expect(JSON.stringify(res.body)).not.toContain("secret-token");
    const [row] = await db.select().from(lmsConnections);
    expect(row!.secret).not.toContain("secret-token");
    expect(fetcher).toHaveBeenCalledTimes(1);

    const listed = await as(ALICE).get("/api/v1/deadlines/upcoming");
    expect(listed.body.map((d: { title: string; courseId: string; source: string }) => [d.title, d.courseId, d.source])).toEqual([
      ["Essay 1", "c-hist", "brightspace"],
      ["Quiz 2", "c-math", "brightspace"],
    ]);
  });

  it("rejects a bad link without saving anything", async () => {
    feed = "<html>Log in</html>";
    const res = await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "invalid_feed", message: expect.stringMatching(/didn't return a calendar/) });

    expect((await as(ALICE).post(`${BASE}/feed`).send({ url: "http://school.brightspace.com/x.ics" })).status).toBe(400);
    expect(await db.select().from(lmsConnections)).toHaveLength(0);
  });

  it("hides network details when the fetch fails unexpectedly", async () => {
    fetcher.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:443"));
    const res = await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("We couldn't reach that link. Check it and try again.");
  });

  it("reconnecting with a new link keeps deadlines, completion and course choices", async () => {
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    await db.update(deadlines).set({ completedAt: new Date() }).where(eq(deadlines.externalId, "essay@d2l"));
    const [link] = await db.select().from(lmsCourseLinks).where(eq(lmsCourseLinks.externalKey, "ou:222"));
    await db.update(lmsCourseLinks).set({ ignored: true }).where(eq(lmsCourseLinks.id, link!.id));

    const res = await as(ALICE).post(`${BASE}/feed`).send({ url: `${FEED}-new` });
    expect(res.status).toBe(201);
    expect(await db.select().from(lmsConnections)).toHaveLength(1);
    const rows = await db.select().from(deadlines);
    expect(rows.map((row) => [row.externalId, row.completedAt !== null])).toEqual([["essay@d2l", true]]);
  });

  it("saves the course-matching step and re-files deadlines", async () => {
    await withCourses(ALICE);
    const connected = await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    const [hist, math] = connected.body.courses;

    const res = await as(ALICE)
      .put(`${BASE}/courses`)
      .send({
        courses: [
          { id: hist.id, courseId: "c-math", ignored: false },
          { id: math.id, courseId: null, ignored: true },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.sync).toMatchObject({ ok: true, updated: 1, removed: 1 });
    expect(res.body.courses.map((c: { courseId: string; ignored: boolean }) => [c.courseId, c.ignored])).toEqual([
      ["c-math", false],
      [null, true],
    ]);
    const rows = await db.select().from(deadlines);
    expect(rows.map((row) => [row.title, row.courseId])).toEqual([["Essay 1", "c-math"]]);
  });

  it("refuses courses that aren't the student's", async () => {
    await withCourses(ALICE);
    const connected = await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    const hist = connected.body.courses[0];

    const notMine = await as(ALICE).put(`${BASE}/courses`).send({ courses: [{ id: hist.id, courseId: "c-nope", ignored: false }] });
    expect(notMine.status).toBe(404);

    await as(BOB).post(`${BASE}/feed`).send({ url: FEED });
    const othersLink = await as(BOB).put(`${BASE}/courses`).send({ courses: [{ id: hist.id, courseId: null, ignored: true }] });
    expect(othersLink.status).toBe(404);
  });

  it("limits manual syncs to one a minute", async () => {
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    const tooSoon = await as(ALICE).post(`${BASE}/sync`);
    expect(tooSoon.status).toBe(429);

    await db.update(lmsConnections).set({ lastSyncedAt: new Date(Date.now() - 120_000) });
    feed = calendar(essay);
    const res = await as(ALICE).post(`${BASE}/sync`);
    expect(res.status).toBe(200);
    expect(res.body.sync).toMatchObject({ ok: true, removed: 1 });
  });

  it("shows a failed sync so the student can fix the link", async () => {
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    await db.update(lmsConnections).set({ lastSyncedAt: new Date(0) });
    feed = "<html>Log in</html>";

    const res = await as(ALICE).post(`${BASE}/sync`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "error", lastError: expect.stringMatching(/didn't return a calendar/), sync: { ok: false } });
  });

  it("disconnect removes the connection and what it synced, but not the student's own deadlines", async () => {
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    await as(ALICE).post("/api/v1/deadlines").send({ title: "Revise", dueAt: Date.now() + 86_400_000, kind: "task" });

    expect((await as(ALICE).delete(BASE)).status).toBe(204);
    expect((await as(ALICE).get(BASE)).body).toEqual({ connected: false });
    expect((await db.select().from(deadlines)).map((row) => row.title)).toEqual(["Revise"]);
  });

  it("only touches the caller's own connection", async () => {
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    expect((await as(BOB).get(BASE)).body).toEqual({ connected: false });
    expect((await as(BOB).post(`${BASE}/sync`)).status).toBe(404);
    await as(BOB).delete(BASE);
    expect(await db.select().from(lmsConnections)).toHaveLength(1);
  });

  it("answers 503 when the server has no encryption key", async () => {
    const keyless = buildApp({ db, env: testEnv, feedFetcher: fetcher });
    const res = await request(keyless).get(BASE).set("Authorization", bearer(ALICE));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("integration_unavailable");
  });
});

describe("parseCourseName", () => {
  it.each([
    ["Programming 3B PROG7312 2026 FT BCAD0701 EMGPMD Term2 GR02", "Programming 3B", "PROG7312"],
    ["Information Systems 3D INSY7314 2026 FT BCAD0701 EMGPMD Term2 GR02", "Information Systems 3D", "INSY7314"],
    ["HIST101 - History of Africa", "History of Africa", "HIST101"],
    ["MATH201: Calculus", "Calculus", "MATH201"],
    ["Academic Writing", "Academic Writing", ""],
  ])("%s -> %s / %s", (external, name, code) => {
    expect(parseCourseName(external)).toEqual({ name, code });
  });
});

describe("POST /courses/import", () => {
  it("creates courses for unmatched links, reuses a matching code, skips ignored ones, and re-files deadlines", async () => {
    await withCourses(ALICE);
    // Links that predate auto-creation: all unmatched.
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    await db.update(lmsCourseLinks).set({ courseId: null });
    await db.update(users).set({ courses: [{ id: "c-math", name: "Maths", code: "MATH201" }] }).where(eq(users.clerkUserId, ALICE));
    feed = calendar(essay, quiz, { uid: "lab@d2l", summary: "Lab 1 - Due", days: 8, location: "CHEM101 - Chemistry", ou: "333" });
    await db.update(lmsConnections).set({ lastSyncedAt: new Date(0) });
    await as(ALICE).post(`${BASE}/sync`);
    await db.update(lmsCourseLinks).set({ courseId: null, ignored: true }).where(eq(lmsCourseLinks.externalKey, "ou:333"));
    await db.update(lmsCourseLinks).set({ courseId: null });
    await db.update(users).set({ courses: [{ id: "c-math", name: "Maths", code: "MATH201" }] }).where(eq(users.clerkUserId, ALICE));
    await db.update(deadlines).set({ courseId: null });

    const res = await as(ALICE).post(`${BASE}/courses/import`);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);

    const [owner] = await db.select().from(users).where(eq(users.clerkUserId, ALICE));
    expect(owner!.courses!.map((c) => [c.name, c.code])).toEqual([
      ["Maths", "MATH201"],
      ["History of Africa", "HIST101"],
    ]);
    const hist = owner!.courses!.find((c) => c.code === "HIST101")!.id;
    expect(res.body.courses.map((c: { name: string; courseId: string | null; ignored: boolean }) => [c.name, c.courseId, c.ignored])).toEqual([
      ["CHEM101 - Chemistry", null, true],
      ["HIST101 - History of Africa", hist, false],
      ["MATH201 - Calculus", "c-math", false],
    ]);
    const rows = await db.select().from(deadlines).orderBy(deadlines.dueAt);
    expect(rows.map((row) => [row.title, row.courseId])).toEqual([
      ["Essay 1", hist],
      ["Quiz 2", "c-math"],
    ]);
  });

  it("needs a connection", async () => {
    expect((await as(ALICE).post(`${BASE}/courses/import`)).status).toBe(404);
  });
});

describe("matchCourse", () => {
  const own = [
    { id: "a", name: "History", code: "HIST 101" },
    { id: "b", name: "History 2", code: "HIST1012" },
    { id: "c", name: "Short", code: "CS" },
  ];

  it("matches a code inside the Brightspace name, ignoring spacing and case", () => {
    expect(matchCourse("hist101 - History of Africa", own.slice(0, 1))).toBe("a");
  });

  it("gives up on ambiguous or too-short codes", () => {
    expect(matchCourse("HIST1012 - Advanced", own)).toBeNull();
    expect(matchCourse("CS basics", own.slice(2))).toBeNull();
    expect(matchCourse("Biology", own)).toBeNull();
  });
});

describe("brightspace-sync job", () => {
  it("syncs every feed connection and counts failures without stopping", async () => {
    await as(ALICE).post(`${BASE}/feed`).send({ url: FEED });
    await as(BOB).post(`${BASE}/feed`).send({ url: FEED });

    const box = createSecretBox(KEY);
    const oneBroken: FeedFetcher = async (url) => {
      if (url.href.endsWith("broken")) return "not a calendar";
      return calendar(essay);
    };
    const [bob] = await db.select().from(lmsConnections).innerJoin(users, eq(users.id, lmsConnections.userId)).where(eq(users.clerkUserId, BOB));
    await db
      .update(lmsConnections)
      .set({ secret: box.seal(`${FEED}broken`) })
      .where(eq(lmsConnections.id, bob!.lms_connections.id));

    const result = await syncBrightspaceFeeds(db, box, oneBroken);
    expect(result).toEqual({ connections: 2, synced: 1, failed: 1 });
    const statuses = (await db.select().from(lmsConnections)).map((row) => row.status).sort();
    expect(statuses).toEqual(["active", "error"]);
  });
});
