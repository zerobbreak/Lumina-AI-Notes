import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { recordings } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { AUDIO_LIMIT_MINUTES, checkAndUpdateAudioUsage, getUserUsage } from "../recordings/usage.js";
import { isOwnedKey, type Storage } from "../storage/s3.js";
import { parse } from "./validation.js";

type RecordingRow = typeof recordings.$inferSelect;

const sessionId = z.string().trim().min(1).max(200);
const title = z.string().trim().min(1).max(500);
/** Seconds, as on Convex. */
const duration = z.number().finite().min(0).max(86_400).optional();

const saveBody = z.object({
  sessionId,
  title,
  transcript: z.string().max(2_000_000),
  duration,
});

const draftBody = saveBody;

const uploadedBody = z.object({
  title,
  storageKey: z.string().min(1).max(1024),
  duration,
  sessionId: sessionId.optional(),
});

const transcriptBody = z.object({
  transcript: z.string().max(2_000_000),
});

const audioLimitQuery = z.object({
  estimatedMinutes: z.coerce.number().finite().min(0).max(AUDIO_LIMIT_MINUTES).optional(),
});

/** Port of convex/recordings.ts. Upload URLs live under /uploads. */
export function createRecordingsRouter(db: Db, storage: Storage) {
  const router = Router();

  async function findOwned(recordingId: string, userId: string) {
    const [row] = await db
      .select()
      .from(recordings)
      .where(and(eq(recordings.id, recordingId), eq(recordings.userId, userId)))
      .limit(1);
    if (!row) {
      throw new HttpError(404, "Recording not found or unauthorized", "not_found");
    }
    return row;
  }

  /** Fresh signed link when the audio lives in our bucket. */
  async function withAudioUrl<T extends Pick<RecordingRow, "audioStorageKey" | "audioUrl" | "title">>(row: T) {
    if (!row.audioStorageKey) return row;
    return { ...row, audioUrl: await storage.createDownloadUrl(row.audioStorageKey, row.title) };
  }

  async function toResponse(row: RecordingRow) {
    const { audioStorageKey: _audioStorageKey, ...rest } = await withAudioUrl(row);
    return rest;
  }

  // checkAudioLimit
  router.get("/audio-limit", async (req, res) => {
    const user = currentUser(res);
    const { estimatedMinutes = 0 } = parse(audioLimitQuery, req.query);
    const usage = await getUserUsage(db, user.id);
    const limit = AUDIO_LIMIT_MINUTES;
    const remaining = Math.max(0, limit - usage.audioMinutesUsed);
    const allowed = remaining >= estimatedMinutes;

    res.json({
      allowed,
      remaining,
      used: usage.audioMinutesUsed,
      limit,
      ...(allowed
        ? {}
        : { error: `You have ${remaining.toFixed(1)} minutes remaining this month.` }),
    });
  });

  // getRecordings
  router.get("/", async (_req, res) => {
    const user = currentUser(res);
    const rows = await db
      .select()
      .from(recordings)
      .where(eq(recordings.userId, user.id))
      .orderBy(desc(recordings.createdAt));
    res.json(await Promise.all(rows.map(toResponse)));
  });

  // cleanupOrphanedRecordings — before /:id so "cleanup-orphaned" isn't read as an id.
  router.post("/cleanup-orphaned", async (_req, res) => {
    const user = currentUser(res);
    const rows = await db.select().from(recordings).where(eq(recordings.userId, user.id));
    const TEN_MINUTES = 10 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    for (const row of rows) {
      const age = now - row.createdAt.getTime();
      if (age > TEN_MINUTES && row.transcript.trim().length === 0) {
        await db.delete(recordings).where(eq(recordings.id, row.id));
        if (row.audioStorageKey) {
          await storage.delete(row.audioStorageKey).catch((err) => {
            console.error(`Failed to delete ${row.audioStorageKey} from storage:`, err);
          });
        }
        deletedCount++;
      }
    }

    res.json({ deletedCount });
  });

  // upsertRecordingDraft
  router.put("/draft", async (req, res) => {
    const user = currentUser(res);
    const body = parse(draftBody, req.body);

    const [existing] = await db
      .select()
      .from(recordings)
      .where(and(eq(recordings.userId, user.id), eq(recordings.sessionId, body.sessionId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(recordings)
        .set({
          title: body.title,
          transcript: body.transcript,
          duration: body.duration ?? null,
        })
        .where(eq(recordings.id, existing.id))
        .returning();
      res.json(await toResponse(updated));
      return;
    }

    const [created] = await db
      .insert(recordings)
      .values({
        userId: user.id,
        sessionId: body.sessionId,
        title: body.title,
        transcript: body.transcript,
        duration: body.duration ?? null,
      })
      .returning();
    res.status(201).json(await toResponse(created));
  });

  // saveUploadedRecording
  router.post("/uploaded", async (req, res) => {
    const user = currentUser(res);
    const body = parse(uploadedBody, req.body);

    if (!isOwnedKey(user.clerkUserId, body.storageKey)) {
      throw new HttpError(404, "Upload not found", "not_found");
    }
    const object = await storage.stat(body.storageKey);
    if (!object) {
      throw new HttpError(400, "Upload not found in storage; PUT the file first", "upload_missing");
    }

    const durationMinutes = (body.duration ?? 0) / 60;
    if (durationMinutes > 0) {
      const usageCheck = await checkAndUpdateAudioUsage(db, user.id, durationMinutes);
      if (!usageCheck.allowed) {
        throw new HttpError(403, usageCheck.error ?? "Audio limit exceeded", "audio_limit_exceeded");
      }
    }

    const [created] = await db
      .insert(recordings)
      .values({
        userId: user.id,
        sessionId: body.sessionId ?? randomUUID(),
        title: body.title,
        transcript: "",
        audioStorageKey: body.storageKey,
        audioUrl: await storage.createDownloadUrl(body.storageKey, body.title),
        duration: body.duration ?? null,
      })
      .returning();

    res.status(201).json(await toResponse(created));
  });

  // saveRecording
  router.post("/", async (req, res) => {
    const user = currentUser(res);
    const body = parse(saveBody, req.body);

    const durationMinutes = (body.duration ?? 0) / 60;
    if (durationMinutes > 0) {
      const usageCheck = await checkAndUpdateAudioUsage(db, user.id, durationMinutes);
      if (!usageCheck.allowed) {
        throw new HttpError(403, usageCheck.error ?? "Audio limit exceeded", "audio_limit_exceeded");
      }
    }

    const [created] = await db
      .insert(recordings)
      .values({
        userId: user.id,
        sessionId: body.sessionId,
        title: body.title,
        transcript: body.transcript,
        duration: body.duration ?? null,
      })
      .returning();

    res.status(201).json(await toResponse(created));
  });

  // getRecording
  router.get("/:id", async (req, res) => {
    const row = await findOwned(req.params.id, currentUser(res).id);
    res.json(await toResponse(row));
  });

  // updateRecordingTranscript
  router.patch("/:id/transcript", async (req, res) => {
    const user = currentUser(res);
    const { transcript } = parse(transcriptBody, req.body);
    await findOwned(req.params.id, user.id);
    await db.update(recordings).set({ transcript }).where(eq(recordings.id, req.params.id));
    res.status(204).end();
  });

  // deleteRecording
  router.delete("/:id", async (req, res) => {
    const user = currentUser(res);
    const row = await findOwned(req.params.id, user.id);
    await db.delete(recordings).where(eq(recordings.id, row.id));
    if (row.audioStorageKey) {
      await storage.delete(row.audioStorageKey).catch((err) => {
        console.error(`Failed to delete ${row.audioStorageKey} from storage:`, err);
      });
    }
    res.status(204).end();
  });

  return router;
}
