import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sendDueReminders } from "../src/deadlines/sendReminders.js";
import type { Db } from "../src/db/client.js";
import { deadlineReminders, deadlines, notifications, users } from "../src/db/schema/index.js";
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
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const userId = async (user: string) => (await as(user).get("/api/v1/users/me")).body.id as string;

describe("deadlines", () => {
  it("creates a deadline with reminder rows", async () => {
    const dueAt = Date.now() + 48 * 60 * 60 * 1000;
    const res = await as(ALICE).post("/api/v1/deadlines").send({
      title: "Midterm",
      dueAt,
      kind: "exam",
    });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");

    const reminders = await db
      .select()
      .from(deadlineReminders)
      .where(eq(deadlineReminders.deadlineId, res.body.id));
    expect(reminders.length).toBeGreaterThan(0);
  });

  it("lists upcoming deadlines in the window", async () => {
    const dueAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
    await as(ALICE).post("/api/v1/deadlines").send({ title: "Essay", dueAt, kind: "assignment" });

    const list = await as(ALICE).get("/api/v1/deadlines/upcoming?limit=5&windowDays=30");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ title: "Essay", kind: "assignment" });
    expect(list.body[0].dueAt).toBe(dueAt);
  });

  it("updates completion and rebuilds reminders", async () => {
    const dueAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const created = await as(ALICE)
      .post("/api/v1/deadlines")
      .send({ title: "Lab", dueAt, kind: "task" });
    const id = created.body.id as string;

    await as(ALICE).patch(`/api/v1/deadlines/${id}`).send({ completed: true });
    expect((await db.select().from(deadlines).where(eq(deadlines.id, id)))[0]?.completedAt).toBeTruthy();
    expect(await db.select().from(deadlineReminders).where(eq(deadlineReminders.deadlineId, id))).toHaveLength(0);

    await as(ALICE).patch(`/api/v1/deadlines/${id}`).send({ completed: false });
    expect(
      (await db.select().from(deadlineReminders).where(eq(deadlineReminders.deadlineId, id))).length,
    ).toBeGreaterThan(0);
  });

  it("deletes a deadline and its reminders", async () => {
    const created = await as(ALICE)
      .post("/api/v1/deadlines")
      .send({ title: "Quiz", dueAt: Date.now() + 86_400_000, kind: "exam" });
    const id = created.body.id as string;
    await as(ALICE).delete(`/api/v1/deadlines/${id}`);
    expect(await db.select().from(deadlines).where(eq(deadlines.id, id))).toHaveLength(0);
  });

  it("hides other users' deadlines", async () => {
    const created = await as(ALICE)
      .post("/api/v1/deadlines")
      .send({ title: "Private", dueAt: Date.now() + 86_400_000, kind: "task" });
    expect((await as(BOB).patch(`/api/v1/deadlines/${created.body.id}`).send({ title: "Hack" })).status).toBe(
      404,
    );
  });

  it("dispatches due reminders into notifications", async () => {
    const aliceId = await userId(ALICE);
    const dueAt = Date.now() + 30 * 60 * 1000;
    const [deadline] = await db
      .insert(deadlines)
      .values({
        userId: aliceId,
        title: "Paper",
        dueAt: new Date(dueAt),
        kind: "assignment",
      })
      .returning();

    await db.insert(deadlineReminders).values({
      userId: aliceId,
      deadlineId: deadline!.id,
      remindAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const { sent } = await sendDueReminders(db, 10);
    expect(sent).toBe(1);
    expect(await db.select().from(notifications).where(eq(notifications.userId, aliceId))).toHaveLength(1);
  });

  it("lists unfinished overdue deadlines, most recent first, within the window", async () => {
    const day = 24 * 60 * 60 * 1000;
    const make = (title: string, dueAt: number) =>
      as(ALICE).post("/api/v1/deadlines").send({ title, dueAt, kind: "assignment" });
    await make("Yesterday", Date.now() - day);
    await make("Last week", Date.now() - 7 * day);
    await make("Long ago", Date.now() - 30 * day);
    await make("Tomorrow", Date.now() + day);
    const done = await make("Done", Date.now() - 2 * day);
    await as(ALICE).patch(`/api/v1/deadlines/${done.body.id}`).send({ completed: true });
    await as(BOB).post("/api/v1/deadlines").send({ title: "Bob's", dueAt: Date.now() - day, kind: "task" });

    const res = await as(ALICE).get("/api/v1/deadlines/overdue");
    expect(res.status).toBe(200);
    expect(res.body.map((d: { title: string }) => d.title)).toEqual(["Yesterday", "Last week"]);
    expect(res.body[0].source).toBe("manual");
  });
});
