import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { files } from "../db/schema/index.js";
import { saveExtractedContent, updateProcessingStatus } from "../files/processing.js";
import type { Storage } from "../storage/s3.js";
import { embedTextForVectorSearch } from "./embedding.js";

export type ProcessDocumentResult = { success: boolean; error?: string };

/** Port of convex/ai.ts processDocument. */
export async function runProcessDocument(
  db: Db,
  storage: Storage,
  fileId: string,
  userId: string,
  apiKey: string,
): Promise<ProcessDocumentResult> {
  try {
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .limit(1);
    if (!file?.storageKey) {
      throw new Error("File not found or missing storage key");
    }

    await updateProcessingStatus(db, fileId, { processingStatus: "processing", progressPercent: 10 });

    const bytes = await storage.getBytes(file.storageKey);
    const base64Data = Buffer.from(bytes).toString("base64");

    await updateProcessingStatus(db, fileId, { processingStatus: "processing", progressPercent: 40 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
      throw new Error("No text could be extracted from PDF");
    }

    const textForEmbedding = `${summary}\n\n${extractedText.substring(0, 5000)}`;
    const embedding = await embedTextForVectorSearch(genAI, textForEmbedding, TaskType.RETRIEVAL_DOCUMENT);
    if (!embedding) {
      throw new Error("Failed to generate document embedding");
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
    await updateProcessingStatus(db, fileId, {
      processingStatus: "error",
      errorMessage: error instanceof Error ? error.message : "Processing failed",
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}
