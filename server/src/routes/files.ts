import { and, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { documents, files } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { isOwnedKey, type Storage } from "../storage/s3.js";
import { runProcessDocument, STALE_PROCESSING_MS } from "../ai/processDocument.js";
import { consumeAiQuota } from "../middleware/ai-rate-limit.js";
import { queuePositionOf } from "../files/processing.js";
import { parse } from "./validation.js";

type FileRow = typeof files.$inferSelect;

// Never sent to clients: vectors are large and only used server-side.
const { embedding: _embedding, searchName: _searchName, ...fileColumns } = getTableColumns(files);
// Lists skip the extracted text too, which can be a whole PDF's worth.
const { extractedText: _extractedText, ...listColumns } = fileColumns;

const createFileBody = z
  .object({
    name: z.string().trim().min(1).max(255),
    /** "pdf" | "img" | "link" */
    type: z.string().trim().min(1).max(50),
    courseId: z.string().max(200).optional(),
    /** External link (type "link") */
    url: z.url({ protocol: /^https?$/ }).optional(),
    /** Key returned by POST /uploads, after the client PUT the file */
    storageKey: z.string().min(1).max(1024).optional(),
  })
  .refine((b) => Boolean(b.url) !== Boolean(b.storageKey), {
    message: "Provide either url or storageKey",
  });

const listQuery = z.object({
  courseId: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const renameBody = z.object({ name: z.string().trim().min(1).max(255) });

/** Port of convex/files.ts (the client-facing half). */
export function createFilesRouter(db: Db, storage: Storage, geminiApiKey?: string) {
  const router = Router();

  /** Uploaded files get a fresh signed link; links keep their own URL. */
  async function withUrl<T extends Pick<FileRow, "storageKey" | "name" | "url">>(file: T) {
    if (!file.storageKey) return file;
    return { ...file, url: await storage.createDownloadUrl(file.storageKey, file.name) };
  }

  async function findOwned(fileId: string, userId: string) {
    const [file] = await db
      .select(fileColumns)
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .limit(1);
    if (!file) {
      throw new HttpError(404, "File not found", "not_found");
    }
    return file;
  }

  const queueProcess = (fileId: string, userId: string) => {
    if (!geminiApiKey) return;
    void runProcessDocument(db, storage, fileId, userId, geminiApiKey);
  };

  // uploadFile
  router.post("/", async (req, res) => {
    const user = currentUser(res);
    const body = parse(createFileBody, req.body);

    let object: { size: number; contentType: string | undefined } | null = null;
    if (body.storageKey) {
      if (!isOwnedKey(user.clerkUserId, body.storageKey)) {
        throw new HttpError(404, "Upload not found", "not_found");
      }
      // Only record files that actually reached the bucket.
      object = await storage.stat(body.storageKey);
      if (!object) {
        throw new HttpError(400, "Upload not found in storage; PUT the file first", "upload_missing");
      }
    }

    const isPdf =
      body.type === "pdf" ||
      object?.contentType === "application/pdf" ||
      body.name.toLowerCase().endsWith(".pdf");

    // Recording a PDF starts a Gemini run, so it spends AI quota. Checked
    // before the row exists, so a refused upload can simply be sent again.
    if (isPdf) await consumeAiQuota(db, user.id);

    const now = new Date();
    const [file] = await db
      .insert(files)
      .values({
        userId: user.id,
        name: body.name,
        type: body.type,
        url: body.url,
        storageKey: body.storageKey,
        contentType: object?.contentType,
        sizeBytes: object?.size,
        courseId: body.courseId,
        lastAccessedAt: now,
        // Picked up by document processing.
        processingStatus: isPdf ? "pending" : undefined,
      })
      .returning(fileColumns);

    if (isPdf) {
      queueProcess(file.id, user.id);
    }
    res.status(201).json(await withUrl(file));
  });

  // getFiles (recent) / getFilesByContext (?courseId=)
  router.get("/", async (req, res) => {
    const user = currentUser(res);
    const { courseId, limit } = parse(listQuery, req.query);

    const rows = courseId
      ? await db
          .select(listColumns)
          .from(files)
          .where(and(eq(files.userId, user.id), eq(files.courseId, courseId)))
          .orderBy(desc(files.createdAt))
      : await db
          .select(listColumns)
          .from(files)
          .where(eq(files.userId, user.id))
          .orderBy(desc(files.createdAt))
          .limit(limit);

    res.json(await Promise.all(rows.map(withUrl)));
  });

  // getDocumentsByIds
  router.post("/by-ids", async (req, res) => {
    const user = currentUser(res);
    const { ids } = parse(z.object({ ids: z.array(z.string().min(1).max(200)).min(1).max(50) }), req.body);
    const unique = [...new Set(ids)];
    const rows = await db
      .select({
        ...listColumns,
        summary: files.summary,
        keyTopics: files.keyTopics,
        processingStatus: files.processingStatus,
      })
      .from(files)
      .where(and(eq(files.userId, user.id), inArray(files.id, unique)));
    res.json(await Promise.all(rows.map(withUrl)));
  });

  // getPendingFiles
  router.get("/pending", async (_req, res) => {
    const user = currentUser(res);
    const rows = await db
      .select(listColumns)
      .from(files)
      .where(and(eq(files.userId, user.id), eq(files.processingStatus, "pending")))
      .orderBy(files.createdAt)
      .limit(10);
    for (const row of rows) {
      queueProcess(row.id, user.id);
    }
    res.json(
      await Promise.all(rows.map(async (row) => ({ ...row, queuePosition: await queuePositionOf(db, row) }))),
    );
  });

  // getFile
  router.get("/:id", async (req, res) => {
    const file = await findOwned(req.params.id, currentUser(res).id);
    res.json(await withUrl(file));
  });

  // getFileProcessingStatus
  router.get("/:id/status", async (req, res) => {
    const file = await findOwned(req.params.id, currentUser(res).id);
    res.json({
      fileId: file.id,
      status: file.processingStatus,
      progressPercent: file.progressPercent,
      queuePosition: file.queuePosition,
      errorMessage: file.errorMessage,
    });
  });

  // renameFile
  router.patch("/:id", async (req, res) => {
    const user = currentUser(res);
    const { name } = parse(renameBody, req.body);
    await findOwned(req.params.id, user.id);
    const [file] = await db
      .update(files)
      .set({ name, lastAccessedAt: new Date() })
      .where(eq(files.id, req.params.id))
      .returning(listColumns);
    res.json(await withUrl(file));
  });

  // touchFile
  router.post("/:id/touch", async (req, res) => {
    const user = currentUser(res);
    await findOwned(req.params.id, user.id);
    await db.update(files).set({ lastAccessedAt: new Date() }).where(eq(files.id, req.params.id));
    res.status(204).end();
  });

  // retryProcessing
  router.post("/:id/retry", async (req, res) => {
    const user = currentUser(res);
    const file = await findOwned(req.params.id, user.id);
    const startedAt = file.processingStartedAt?.getTime();
    if (file.processingStatus === "processing" && startedAt && Date.now() - startedAt < STALE_PROCESSING_MS) {
      throw new HttpError(409, "This file is already being processed", "already_processing");
    }
    await consumeAiQuota(db, user.id);
    await db
      .update(files)
      .set({ processingStatus: "pending", progressPercent: 0, errorMessage: null, queuePosition: null })
      .where(eq(files.id, req.params.id));
    queueProcess(req.params.id, user.id);
    res.status(204).end();
  });

  // deleteFile. Convex left the stored object for the cleanup cron; here it goes too.
  router.delete("/:id", async (req, res) => {
    const user = currentUser(res);
    const file = await findOwned(req.params.id, user.id);

    await db.transaction(async (tx) => {
      await tx.delete(files).where(eq(files.id, file.id));
      if (file.storageKey) {
        // Embedded chunks of this upload; the key is under the user's prefix.
        await tx.delete(documents).where(eq(documents.storageKey, file.storageKey));
      }
    });

    if (file.storageKey) {
      // The row is gone either way; a failed delete only leaves an orphan object.
      await storage.delete(file.storageKey).catch((err) => {
        console.error(`Failed to delete ${file.storageKey} from storage:`, err);
      });
    }
    res.status(204).end();
  });

  return router;
}
