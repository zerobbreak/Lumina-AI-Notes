import { lt, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { uploadDailyUsage } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { isOwnedKey, newObjectKey, type Storage } from "../storage/s3.js";
import { parse } from "./validation.js";

/**
 * PDFs, images, audio/video recordings, plain text and Office documents. Not
 * SVG: it's an image type that can carry script, which would run when a
 * download link is opened.
 */
const ALLOWED_CONTENT_TYPE =
  /^(?:image\/(?!svg)[\w.+-]+|(?:audio|video)\/[\w.+-]+|application\/pdf|text\/(?:plain|markdown)|application\/vnd\.openxmlformats-officedocument\.[\w.]+)$/;

const createUploadBody = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().regex(ALLOWED_CONTENT_TYPE, "Unsupported file type"),
  size: z.number().int().positive(),
});

const keyQuery = z.object({ key: z.string().min(1).max(1024) });

/**
 * Direct-to-bucket uploads:
 *   1. POST /uploads          -> signed PUT URL + key
 *   2. client PUTs the file to that URL (bytes never pass through the API)
 *   3. GET  /uploads/stat     -> confirm it landed (size/type) before saving a row
 * Later, the files/recordings routes store the key and call these helpers directly.
 */
export function createUploadsRouter(
  db: Db,
  storage: Storage,
  { maxUploadBytes, maxBytesPerDay }: { maxUploadBytes: number; maxBytesPerDay: number },
) {
  const router = Router();

  /**
   * Reserves `size` bytes of today's allowance, or returns false. One
   * conditional upsert, so parallel requests can't both squeeze under the cap.
   */
  async function reserveBytes(userId: string, size: number) {
    // The first upload of the day inserts without the check below.
    if (size > maxBytesPerDay) return false;
    const day = new Date().toISOString().slice(0, 10);
    const [row] = await db
      .insert(uploadDailyUsage)
      .values({ userId, day, bytes: size })
      .onConflictDoUpdate({
        target: [uploadDailyUsage.userId, uploadDailyUsage.day],
        set: { bytes: sql`${uploadDailyUsage.bytes} + ${size}` },
        setWhere: sql`${uploadDailyUsage.bytes} + ${size} <= ${maxBytesPerDay}`,
      })
      .returning({ bytes: uploadDailyUsage.bytes });
    // Best-effort sweep of past days.
    db.delete(uploadDailyUsage)
      .where(lt(uploadDailyUsage.day, day))
      .catch(() => {});
    return Boolean(row);
  }

  router.post("/", async (req, res) => {
    // Keys are prefixed with the Clerk id, which is stable across a data re-import.
    const userId = currentUser(res).clerkUserId;
    const body = parse(createUploadBody, req.body);
    if (body.size > maxUploadBytes) {
      throw new HttpError(
        413,
        `File is larger than the ${Math.round(maxUploadBytes / 1024 / 1024)} MB limit`,
        "file_too_large",
      );
    }
    if (!(await reserveBytes(currentUser(res).id, body.size))) {
      throw new HttpError(
        429,
        `You've reached today's upload limit of ${Math.round(maxBytesPerDay / 1024 / 1024)} MB. It resets at midnight UTC.`,
        "upload_quota_exceeded",
      );
    }
    const key = newObjectKey(userId, body.filename);
    res.status(201).json(await storage.createUploadUrl(key, body.contentType, body.size));
  });

  router.get("/stat", async (req, res) => {
    const { key } = ownedKey(req.query, currentUser(res).clerkUserId);
    const object = await storage.stat(key);
    if (!object) {
      throw new HttpError(404, "Upload not found", "not_found");
    }
    res.json({ key, ...object });
  });

  router.get("/download-url", async (req, res) => {
    const { key } = ownedKey(req.query, currentUser(res).clerkUserId);
    res.json({ key, url: await storage.createDownloadUrl(key) });
  });

  router.delete("/", async (req, res) => {
    const { key } = ownedKey(req.query, currentUser(res).clerkUserId);
    await storage.delete(key);
    res.status(204).end();
  });

  return router;
}

/** Users can only touch objects under their own prefix. */
function ownedKey(query: unknown, userId: string) {
  const { key } = parse(keyQuery, query);
  if (!isOwnedKey(userId, key)) {
    // 404 rather than 403 so keys belonging to others aren't confirmed to exist.
    throw new HttpError(404, "Upload not found", "not_found");
  }
  return { key };
}
