import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getLocalDayStart } from "../src/analytics/helpers.js";
import { resetStreaks, updateStudyStreak } from "../src/gamification/streaks.js";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { MAX_BADGES } from "../src/routes/users.js";
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

const userId = async (user: string) => (await as(user).get("/api/v1/users/me")).body.id as string;

describe("GET /api/v1/users/me/gamification", () => {
  it("returns default stats for a new user", async () => {
    const res = await as(ALICE).get("/api/v1/users/me/gamification");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      dailyGoalMinutes: 30,
      dailyGoalCards: 20,
    });
    expect(res.body.lastStudiedDate).toBeUndefined();
  });

  it("does not expose gamification on /users/me", async () => {
    const res = await as(ALICE).get("/api/v1/users/me");
    expect(res.body).not.toHaveProperty("currentStreak");
    expect(res.body).not.toHaveProperty("badges");
  });
});

describe("study streak", () => {
  it("starts at 1 on first study day", async () => {
    const aliceId = await userId(ALICE);
    const tz = -300;
    const streak = await updateStudyStreak(db, aliceId, { tzOffsetMinutes: tz });
    expect(streak).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("increments on consecutive days", async () => {
    const aliceId = await userId(ALICE);
    const tz = 0;
    const today = getLocalDayStart(Date.now(), tz);
    await updateStudyStreak(db, aliceId, { timestamp: today, tzOffsetMinutes: tz });
    const streak = await updateStudyStreak(db, aliceId, {
      timestamp: today + 24 * 60 * 60 * 1000,
      tzOffsetMinutes: tz,
    });
    expect(streak).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it("resets when a day is skipped", async () => {
    const aliceId = await userId(ALICE);
    const tz = 0;
    const today = getLocalDayStart(Date.now(), tz);
    await updateStudyStreak(db, aliceId, { timestamp: today, tzOffsetMinutes: tz });
    const streak = await updateStudyStreak(db, aliceId, {
      timestamp: today + 2 * 24 * 60 * 60 * 1000,
      tzOffsetMinutes: tz,
    });
    expect(streak.currentStreak).toBe(1);
  });

  it("is idempotent within the same local day", async () => {
    const aliceId = await userId(ALICE);
    const tz = 0;
    await updateStudyStreak(db, aliceId, { tzOffsetMinutes: tz });
    const again = await updateStudyStreak(db, aliceId, { tzOffsetMinutes: tz });
    expect(again).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("exposes streak via POST /me/study-streak", async () => {
    const res = await as(ALICE).post("/api/v1/users/me/study-streak").send({ tzOffsetMinutes: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStreak: 1, longestStreak: 1 });
    expect((await as(ALICE).get("/api/v1/users/me/gamification")).body.currentStreak).toBe(1);
  });

  it("resets stale streaks via worker logic", async () => {
    const aliceId = await userId(ALICE);
    const tz = 0;
    const today = getLocalDayStart(Date.now(), tz);
    await updateStudyStreak(db, aliceId, { timestamp: today - 3 * 24 * 60 * 60 * 1000, tzOffsetMinutes: tz });

    const { resetCount } = await resetStreaks(db);
    expect(resetCount).toBe(1);
    expect((await db.select().from(users).where(eq(users.id, aliceId)))[0]?.currentStreak).toBe(0);
  });
});

describe("badges and daily goals", () => {
  it("awards a badge without duplicates", async () => {
    expect((await as(ALICE).post("/api/v1/users/me/badges").send({ badgeId: "early-bird" })).status).toBe(
      204,
    );
    expect((await as(ALICE).post("/api/v1/users/me/badges").send({ badgeId: "early-bird" })).status).toBe(
      204,
    );
    expect((await as(ALICE).get("/api/v1/users/me/gamification")).body.badges).toEqual(["early-bird"]);
  });

  it("updates daily goals", async () => {
    const res = await as(ALICE).patch("/api/v1/users/me/daily-goals").send({ minutes: 45, cards: 15 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ dailyGoalMinutes: 45, dailyGoalCards: 15 });
  });

  it("only touches the caller's badges", async () => {
    await as(ALICE).post("/api/v1/users/me/badges").send({ badgeId: "alice-badge" });
    expect((await as(BOB).get("/api/v1/users/me/gamification")).body.badges).toEqual([]);
  });
});

describe("streak integrity", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("ignores a client-supplied timestamp, so past days can't be replayed", async () => {
    for (let day = 10; day >= 1; day--) {
      await as(ALICE)
        .post("/api/v1/users/me/study-streak")
        .send({ tzOffsetMinutes: 0, timestamp: Date.now() - day * DAY });
    }
    const res = await as(ALICE).post("/api/v1/users/me/study-streak").send({ tzOffsetMinutes: 0 });
    expect(res.body).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it.each([-841, 721, 100_000])("rejects an impossible timezone offset (%i)", async (tzOffsetMinutes) => {
    const res = await as(ALICE).post("/api/v1/users/me/study-streak").send({ tzOffsetMinutes });
    expect(res.status).toBe(400);
  });

  it("doesn't reset the streak when a timezone change makes today start earlier", async () => {
    const aliceId = await userId(ALICE);
    // At 20:00 UTC, offset 600 puts the local day start at 14:00 UTC and
    // offset -480 puts it at 08:00 UTC: the "new" day starts before the
    // one already recorded. That used to count as a missed day.
    const now = Date.UTC(2026, 0, 2, 20);
    await updateStudyStreak(db, aliceId, { timestamp: now - DAY, tzOffsetMinutes: 600 });
    await updateStudyStreak(db, aliceId, { timestamp: now, tzOffsetMinutes: 600 });
    const streak = await updateStudyStreak(db, aliceId, { timestamp: now, tzOffsetMinutes: -480 });
    expect(streak.currentStreak).toBe(2);
  });
});

describe("badge limits", () => {
  it.each(["", "has spaces", "<script>", "x".repeat(65)])("rejects badge id %j", async (badgeId) => {
    expect((await as(ALICE).post("/api/v1/users/me/badges").send({ badgeId })).status).toBe(400);
  });

  it(`caps a user at ${MAX_BADGES} badges`, async () => {
    const aliceId = await userId(ALICE);
    await db
      .update(users)
      .set({ badges: Array.from({ length: MAX_BADGES }, (_, i) => `badge-${i}`) })
      .where(eq(users.id, aliceId));
    const res = await as(ALICE).post("/api/v1/users/me/badges").send({ badgeId: "one-more" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("too_many_badges");
    // Re-awarding one they already hold is still fine.
    expect((await as(ALICE).post("/api/v1/users/me/badges").send({ badgeId: "badge-0" })).status).toBe(204);
  });
});
