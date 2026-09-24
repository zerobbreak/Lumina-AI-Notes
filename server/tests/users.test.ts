import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { DEFAULT_APPEARANCE } from "../src/users/appearance.js";
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
});

const onboarding = {
  major: "biology",
  semester: "Fall 2025",
  courses: [
    { id: "k3j9x", name: "Cell Biology", code: "REQ-001", defaultNoteStyle: "outline" },
    { id: "p0q2z", name: "Genetics", code: "REQ-001" },
  ],
  noteStyle: "outline",
  enabledBlocks: ["diagram", "definition"],
};

describe("GET /api/v1/users/me", () => {
  it("returns the caller with client defaults filled in", async () => {
    const res = await as(ALICE).get("/api/v1/users/me");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      clerkUserId: ALICE,
      onboardingComplete: false,
      courses: [],
      enabledBlocks: [],
      tourCompleted: false,
      tourStep: 0,
    });
  });

  it("fills defaults for rows that predate them, and never sends gamification", async () => {
    const { body: me } = await as(ALICE).get("/api/v1/users/me");
    // What an imported Convex user looks like: missing fields, old streak data.
    await db
      .update(users)
      .set({ courses: null, enabledBlocks: null, tourStep: null, currentStreak: 7, badges: ["early-bird"] })
      .where(eq(users.id, me.id));

    const res = await as(ALICE).get("/api/v1/users/me");
    expect(res.body).toMatchObject({ courses: [], enabledBlocks: [], tourStep: 0 });
    for (const field of [
      "currentStreak",
      "longestStreak",
      "lastStudiedDate",
      "lastTimezoneOffsetMinutes",
      "badges",
      "dailyGoalMinutes",
      "dailyGoalCards",
    ]) {
      expect(res.body).not.toHaveProperty(field);
    }
  });

  it("requires a session", async () => {
    expect((await request(app).get("/api/v1/users/me")).status).toBe(401);
  });
});

describe("POST /api/v1/users/me/onboarding", () => {
  it("saves the answers, keeps the client's course ids and marks onboarding done", async () => {
    const res = await as(ALICE).post("/api/v1/users/me/onboarding").send(onboarding);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      onboardingComplete: true,
      major: "biology",
      semester: "Fall 2025",
      noteStyle: "outline",
      enabledBlocks: ["diagram", "definition"],
      courses: [
        {
          id: "k3j9x",
          name: "Cell Biology",
          code: "REQ-001",
          defaultNoteStyle: "outline",
          color: "indigo",
          modules: [],
        },
        { id: "p0q2z", name: "Genetics", code: "REQ-001", color: "emerald", modules: [] },
      ],
    });
    expect((await as(ALICE).get("/api/v1/users/me")).body.courses).toHaveLength(2);
  });

  it("replaces the course list when run again", async () => {
    await as(ALICE).post("/api/v1/users/me/onboarding").send(onboarding);
    const res = await as(ALICE)
      .post("/api/v1/users/me/onboarding")
      .send({ ...onboarding, courses: [{ id: "new01", name: "Ecology", code: "BIO-210" }] });
    expect(res.status).toBe(200);
    // Replacing the list starts the colours over.
    expect(res.body.courses).toEqual([
      { id: "new01", name: "Ecology", code: "BIO-210", color: "indigo", modules: [] },
    ]);
  });

  it("rejects an unknown note style", async () => {
    const res = await as(ALICE)
      .post("/api/v1/users/me/onboarding")
      .send({ ...onboarding, noteStyle: "cornell" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_request");
  });

  it("rejects an unknown course note style", async () => {
    const res = await as(ALICE)
      .post("/api/v1/users/me/onboarding")
      .send({ ...onboarding, courses: [{ id: "a", name: "A", code: "", defaultNoteStyle: "cornell" }] });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate course ids", async () => {
    const res = await as(ALICE)
      .post("/api/v1/users/me/onboarding")
      .send({ ...onboarding, courses: [onboarding.courses[0], onboarding.courses[0]] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Course ids must be unique");
  });

  it("only touches the caller", async () => {
    await as(ALICE).post("/api/v1/users/me/onboarding").send(onboarding);
    const bob = await as(BOB).get("/api/v1/users/me");
    expect(bob.body).toMatchObject({ onboardingComplete: false, courses: [] });
  });
});

describe("PATCH /api/v1/users/me/tour", () => {
  it("updates only the fields sent", async () => {
    let res = await as(ALICE).patch("/api/v1/users/me/tour").send({ step: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tourStep: 3, tourCompleted: false });

    res = await as(ALICE).patch("/api/v1/users/me/tour").send({ completed: true });
    expect(res.body).toMatchObject({ tourStep: 3, tourCompleted: true });
  });

  it("returns the user unchanged for an empty body", async () => {
    const res = await as(ALICE).patch("/api/v1/users/me/tour").send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tourStep: 0, tourCompleted: false });
  });

  it("rejects a negative step", async () => {
    expect((await as(ALICE).patch("/api/v1/users/me/tour").send({ step: -1 })).status).toBe(400);
  });
});

describe("PATCH /api/v1/users/me/preferences", () => {
  it("updates only the fields sent", async () => {
    await as(ALICE).post("/api/v1/users/me/onboarding").send(onboarding);
    const res = await as(ALICE).patch("/api/v1/users/me/preferences").send({ major: "chemistry" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ major: "chemistry", noteStyle: "outline" });
  });

  it("rejects an unknown note style", async () => {
    const res = await as(ALICE).patch("/api/v1/users/me/preferences").send({ noteStyle: "cornell" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/users/me/appearance", () => {
  it("gives new users the default look", async () => {
    const res = await as(ALICE).get("/api/v1/users/me");
    expect(res.body.appearance).toEqual(DEFAULT_APPEARANCE);
    expect(res.body).not.toHaveProperty("theme");
  });

  it("merges the fields sent into the stored look", async () => {
    await as(ALICE).patch("/api/v1/users/me/appearance").send({ world: "riso" });
    const res = await as(ALICE)
      .patch("/api/v1/users/me/appearance")
      .send({ mode: "dark", accent: { kind: "custom", l: 0.6, c: 0.15, h: 200 } });
    expect(res.status).toBe(200);
    expect(res.body.appearance).toEqual({
      ...DEFAULT_APPEARANCE,
      world: "riso",
      mode: "dark",
      accent: { kind: "custom", l: 0.6, c: 0.15, h: 200 },
    });
    expect((await as(ALICE).get("/api/v1/users/me")).body.appearance.world).toBe("riso");
  });

  it.each([
    [{ world: "terminal" }],
    [{ accent: { kind: "swatch", id: "chartreuse" } }],
    [{ readingSize: 40 }],
    [{ sparkles: true }],
  ])("rejects %j", async (body) => {
    const res = await as(ALICE).patch("/api/v1/users/me/appearance").send(body);
    expect(res.status).toBe(400);
  });

  it("repairs a stored look field by field instead of discarding it", async () => {
    const { body: me } = await as(ALICE).get("/api/v1/users/me");
    await db
      .update(users)
      .set({ appearance: { world: "observatory", uiFont: "comic-sans" } as never })
      .where(eq(users.id, me.id));
    const res = await as(ALICE).get("/api/v1/users/me");
    expect(res.body.appearance).toMatchObject({ world: "observatory", uiFont: DEFAULT_APPEARANCE.uiFont });
  });
});
