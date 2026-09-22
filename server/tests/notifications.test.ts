import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { notifications, users } from "../src/db/schema/index.js";
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

async function seedNotification(user: string, title: string, read = false) {
  const id = await userId(user);
  const [row] = await db
    .insert(notifications)
    .values({
      userId: id,
      type: "deadline_reminder",
      title,
      body: "Details",
      href: "/dashboard?view=calendar",
      ...(read ? { readAt: new Date() } : {}),
    })
    .returning();
  return row!;
}

describe("notifications", () => {
  it("lists notifications newest first", async () => {
    await seedNotification(ALICE, "Older");
    await new Promise((r) => setTimeout(r, 5));
    await seedNotification(ALICE, "Newer");

    const res = await as(ALICE).get("/api/v1/notifications");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe("Newer");
    expect(res.body[0]).toMatchObject({
      type: "deadline_reminder",
      body: "Details",
      href: "/dashboard?view=calendar",
    });
    expect(typeof res.body[0].createdAt).toBe("number");
  });

  it("filters unread notifications", async () => {
    await seedNotification(ALICE, "Unread");
    await seedNotification(ALICE, "Read", true);

    const res = await as(ALICE).get("/api/v1/notifications?unreadOnly=true");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Unread");
  });

  it("returns unread count", async () => {
    await seedNotification(ALICE, "One");
    await seedNotification(ALICE, "Two");
    await seedNotification(ALICE, "Read", true);

    expect((await as(ALICE).get("/api/v1/notifications/unread-count")).body).toEqual({ count: 2 });
  });

  it("marks one notification read", async () => {
    const row = await seedNotification(ALICE, "Due soon");
    const res = await as(ALICE).patch(`/api/v1/notifications/${row.id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.readAt).toBeTypeOf("number");
    expect((await as(ALICE).get("/api/v1/notifications/unread-count")).body.count).toBe(0);
  });

  it("marks all notifications read", async () => {
    await seedNotification(ALICE, "A");
    await seedNotification(ALICE, "B");
    const res = await as(ALICE).post("/api/v1/notifications/mark-all-read");
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    expect((await as(ALICE).get("/api/v1/notifications/unread-count")).body.count).toBe(0);
  });

  it("hides other users' notifications", async () => {
    const row = await seedNotification(ALICE, "Private");
    expect((await as(BOB).patch(`/api/v1/notifications/${row.id}/read`)).status).toBe(404);
    expect((await as(BOB).get("/api/v1/notifications")).body).toHaveLength(0);
  });
});
