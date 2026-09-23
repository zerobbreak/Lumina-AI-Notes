import { and, asc, count, eq, inArray, lt, or } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { files } from "../db/schema/index.js";

type ProcessingPatch = {
  processingStatus?: string | null;
  progressPercent?: number | null;
  errorMessage?: string | null;
  queuePosition?: number | null;
  processedAt?: Date | null;
  extractedText?: string | null;
  summary?: string | null;
  keyTopics?: string[] | null;
  embedding?: number[] | null;
};

/** Port of convex/files.ts updateProcessingStatus. */
export async function updateProcessingStatus(
  db: Db,
  fileId: string,
  patch: Pick<ProcessingPatch, "processingStatus" | "progressPercent" | "errorMessage" | "queuePosition">,
) {
  await db.update(files).set(patch).where(eq(files.id, fileId));
}

/** Port of convex/files.ts saveExtractedContent. */
export async function saveExtractedContent(
  db: Db,
  fileId: string,
  args: {
    extractedText: string;
    summary: string;
    keyTopics: string[];
    embedding: number[];
  },
) {
  await db
    .update(files)
    .set({
      extractedText: args.extractedText.substring(0, 50_000),
      summary: args.summary,
      keyTopics: args.keyTopics,
      embedding: args.embedding,
      processingStatus: "done",
      processedAt: new Date(),
      progressPercent: 100,
      errorMessage: null,
      queuePosition: null,
    })
    .where(eq(files.id, fileId));
}

/** Port of convex/files.ts recomputeFileQueuePositionsInternal. */
export async function recomputeFileQueuePositions(db: Db) {
  const rows = await db
    .select({ id: files.id, createdAt: files.createdAt, processingStatus: files.processingStatus })
    .from(files)
    .where(or(eq(files.processingStatus, "pending"), eq(files.processingStatus, "processing")))
    .orderBy(asc(files.createdAt));

  const queue = rows.slice(0, 20);
  let position = 1;
  for (const file of queue) {
    await db.update(files).set({ queuePosition: position }).where(eq(files.id, file.id));
    position += 1;
  }

  const rest = rows.slice(20).map((r) => r.id);
  if (rest.length > 0) {
    await db.update(files).set({ queuePosition: null }).where(inArray(files.id, rest));
  }

  return { updated: queue.length };
}

/** Only the head of the queue gets a number, as recomputeFileQueuePositions does. */
const NUMBERED_QUEUE_LENGTH = 20;

/**
 * Where each of these files sits in the processing queue, worked out without
 * writing anything: a request from one user mustn't rewrite every user's rows
 * (the worker's recomputeFileQueuePositions keeps the stored column fresh).
 */
export async function queuePositionOf(db: Db, file: { createdAt: Date }): Promise<number | null> {
  const [{ ahead }] = await db
    .select({ ahead: count() })
    .from(files)
    .where(
      and(
        or(eq(files.processingStatus, "pending"), eq(files.processingStatus, "processing")),
        lt(files.createdAt, file.createdAt),
      ),
    );
  return ahead < NUMBERED_QUEUE_LENGTH ? ahead + 1 : null;
}
