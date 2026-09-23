import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { files } from "../db/schema/index.js";
import { saveExtractedContent, updateProcessingStatus } from "../files/processing.js";
import type { Storage } from "../storage/s3.js";
import { embedTextForVectorSearch } from "./embedding.js";
import { clientMessage, UserFacingError } from "./errors.js";
import { getGeminiModel } from "./gemini.js";

export type ProcessDocumentResult = { success: boolean; error?: string };

/**
 * Gemini takes at most 20 MB of inline request data, and base64 grows a file
 * by a third, so anything bigger would fail there anyway. Checking first also
 * keeps a 100 MB upload from being read into memory at all.
 */
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** A run still "processing" after this long died mid-way (e.g. a redeploy) and may be retried. */
export const STALE_PROCESSING_MS = 15 * 60 * 1000;

/**
 * Atomically moves a waiting file to processing. "processing" is claimable
 * too: the queue runs one job per file at a time, so a file already marked
 * processing belongs to a run that died (a redeploy) and is being retried.
 */
async function claimFile(db: Db, fileId: string, userId: string) {
  const [file] = await db
    .update(files)
    .set({
      processingStatus: "processing",
      progressPercent: 10,
      errorMessage: null,
      processingStartedAt: new Date(),
    })
    .where(
      and(
        eq(files.id, fileId),
        eq(files.userId, userId),
        inArray(files.processingStatus, ["pending", "processing"]),
      ),
    )
    .returning();
  return file ?? null;
}

/**
 * Port of convex/ai.ts processDocument, run by the worker's document.process
 * job (concurrency is the worker's). Does nothing unless the file is waiting;
 * its outcome, including errors, is recorded on the file row.
 */
export async function runProcessDocument(
  db: Db,
  storage: Storage,
  fileId: string,
  userId: string,
  apiKey: string,
): Promise<ProcessDocumentResult> {
  const file = await claimFile(db, fileId, userId);
  if (!file) {
    // Missing, someone else's, or finished. Leave its status alone.
    return { success: false, error: "File is not waiting to be processed" };
  }
  return processClaimedFile(db, storage, file, apiKey);
}

async function processClaimedFile(
  db: Db,
  storage: Storage,
  file: typeof files.$inferSelect,
  apiKey: string,
): Promise<ProcessDocumentResult> {
  const fileId = file.id;
  try {
    if (!file.storageKey) {
      throw new UserFacingError("File not found or missing storage key");
    }

    const object = await storage.stat(file.storageKey);
    if (!object) {
      throw new UserFacingError("File not found in storage");
    }
    if (object.size > MAX_PDF_BYTES) {
      throw new UserFacingError(`PDF is too large to process (max ${MAX_PDF_BYTES / 1024 / 1024} MB)`);
    }

    const bytes = await storage.getBytes(file.storageKey);
    const base64Data = Buffer.from(bytes).toString("base64");

    await updateProcessingStatus(db, fileId, { processingStatus: "processing", progressPercent: 40 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = getGeminiModel(apiKey);

    const extractionResult = await model.generateContent([
      { inlineData: { mimeType: "application/pdf", data: base64Data } },
      {
        text: `Analyze this PDF document and extract its content with careful attention to structure and formatting.

Return a JSON response with this exact structure:
{
  "extractedText": "The full text content with preserved structure",
  "summary": "2-3 sentence summary of the document",
  "keyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

CRITICAL EXTRACTION RULES:
1. **Preserve Document Structure**: headings, lists, tables, code blocks
2. **Handle Page Breaks Intelligently**
3. **Format Special Content** with markdown where helpful
4. **Text Quality**: fix obvious OCR errors; preserve technical terms
5. **Summary**: 2-3 sentences capturing main purpose
6. **Key Topics**: 3-7 important concepts

Return ONLY valid JSON, no markdown code fences or explanation.`,
      },
    ]);

    const extractionText = extractionResult.response.text().trim();
    await updateProcessingStatus(db, fileId, { processingStatus: "processing", progressPercent: 70 });

    let extractedText = "";
    let summary = "Document summary unavailable";
    let keyTopics: string[] = [];

    const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          extractedText?: string;
          summary?: string;
          keyTopics?: string[];
        };
        extractedText = parsed.extractedText || "";
        summary = parsed.summary || summary;
        keyTopics = parsed.keyTopics || [];
      } catch {
        extractedText = extractionText;
      }
    } else {
      extractedText = extractionText;
    }

    if (!extractedText.trim()) {
      throw new UserFacingError("No text could be extracted from PDF");
    }

    const textForEmbedding = `${summary}\n\n${extractedText.substring(0, 5000)}`;
    const embedding = await embedTextForVectorSearch(genAI, textForEmbedding, TaskType.RETRIEVAL_DOCUMENT);
    if (!embedding) {
      throw new UserFacingError("Failed to generate document embedding");
    }

    await updateProcessingStatus(db, fileId, { processingStatus: "processing", progressPercent: 90 });
    await saveExtractedContent(db, fileId, {
      extractedText,
      summary,
      keyTopics,
      embedding,
    });
    await updateProcessingStatus(db, fileId, {
      processingStatus: "done",
      progressPercent: 100,
      errorMessage: null,
    });

    return { success: true };
  } catch (error) {
    console.error("processDocument error:", error);
    // Stored and shown in the file list, so never a raw library error.
    const message = clientMessage(error, "Processing failed");
    await updateProcessingStatus(db, fileId, { processingStatus: "error", errorMessage: message });
    return { success: false, error: message };
  }
}
