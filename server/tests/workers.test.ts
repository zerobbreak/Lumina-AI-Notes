import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import {
  flashcardDecks,
  flashcardReviewQueues,
  flashcards,
  files,
  notes,
  presence,
  users,
} from "../src/db/schema/index.js";
import { getStartOfDay } from "../src/flashcards/helpers.js";
import { buildDailyQueues } from "../src/workers/jobs/buildDailyQueues.js";
import { cleanupStalePresence } from "../src/workers/jobs/cleanupPresence.js";
import { cleanupStaleNotesAndFiles } from "../src/workers/jobs/cleanupStale.js";
import { initializeSrsFields } from "../src/workers/jobs/srsBackfill.js";
import { createTestDb, fakeStorage } from "./helpers.js";

const USER = "user_worker_test";

let db: Db;
let closeDb: () => Promise<void>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
});

async function seedUser() {
  await db.insert(users).values({ id: USER, clerkUserId: USER, email: `${USER}@test.local` });
}

describe("worker jobs", () => {
  it("backfills missing SRS fields from the deck owner", async () => {
    await seedUser();
    const [deck] = await db
      .insert(flashcardDecks)
      .values({ userId: USER, title: "Deck" })
      .returning();
    const [card] = await db
      .insert(flashcards)
      .values({
        deckId: deck!.id,
        front: "Q",
        back: "A",
        userId: null,
        easeFactor: null,
        repetitions: null,
        reviewCount: 2,
      })
      .returning();

    const { updated } = await initializeSrsFields(db, 10);
    expect(updated).toBe(1);

    const [row] = await db.select().from(flashcards).where(eq(flashcards.id, card!.id));
    expect(row?.userId).toBe(USER);
    expect(row?.easeFactor).toBe(2.5);
    expect(row?.repetitions).toBe(2);
  });

  it("builds today’s review queue for due cards", async () => {
    await seedUser();
    const [deck] = await db
      .insert(flashcardDecks)
      .values({ userId: USER, title: "Deck" })
      .returning();
    const [card] = await db
      .insert(flashcards)
      .values({
        deckId: deck!.id,
        userId: USER,
        front: "Due",
        back: "Today",
        nextReviewAt: new Date(),
        easeFactor: 2.5,
        repetitions: 0,
        interval: 0,
      })
      .returning();

    const { processedUsers } = await buildDailyQueues(db);
    expect(processedUsers).toBe(1);

    const today = getStartOfDay(new Date());
    const [queue] = await db
      .select()
      .from(flashcardReviewQueues)
      .where(and(eq(flashcardReviewQueues.userId, USER), eq(flashcardReviewQueues.date, today)));
    expect(queue?.cardIds).toEqual([card!.id]);
  });

  it("deletes stale notes and files past the retention window", async () => {
    await seedUser();
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const [note] = await db
      .insert(notes)
      .values({ userId: USER, title: "Old", lastAccessedAt: old })
      .returning();
    const [file] = await db
      .insert(files)
      .values({
        userId: USER,
        name: "old.pdf",
        type: "pdf",
        storageKey: "uploads/old.pdf",
        lastAccessedAt: old,
      })
      .returning();

    const { storage, mock } = fakeStorage();
    const result = await cleanupStaleNotesAndFiles(db, storage, { maxAgeMs: 30 * 24 * 60 * 60 * 1000 });

    expect(result.deletedNotes).toBe(1);
    expect(result.deletedFiles).toBe(1);
    expect(await db.select().from(notes).where(eq(notes.id, note!.id))).toHaveLength(0);
    expect(await db.select().from(files).where(eq(files.id, file!.id))).toHaveLength(0);
    expect(mock.delete).toHaveBeenCalledWith("uploads/old.pdf");
  });

  it("removes stale presence rows", async () => {
    await seedUser();
    const [note] = await db.insert(notes).values({ userId: USER, title: "Live" }).returning();
    await db.insert(presence).values({
      noteId: note!.id,
      userId: USER,
      lastSeen: new Date(Date.now() - 10 * 60 * 1000),
    });

    const { deleted } = await cleanupStalePresence(db);
    expect(deleted).toBe(1);
    expect(await db.select().from(presence)).toHaveLength(0);
  });
});
