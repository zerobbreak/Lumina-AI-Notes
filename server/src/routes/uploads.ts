import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { isOwnedKey, newObjectKey, type Storage } from "../storage/s3.js";
import { parse } from "./validation.js";

/** PDFs, images, audio/video recordings, plain text and Office documents. */
const ALLOWED_CONTENT_TYPE =
  /^(?:(?:image|audio|video)\/[\w.+-]+|application\/pdf|text\/(?:plain|markdown)|application\/vnd\.openxmlformats-officedocument\.[\w.]+)$/;

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
export function createUploadsRouter(storage: Storage, maxUploadBytes: number) {
  const router = Router();

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
