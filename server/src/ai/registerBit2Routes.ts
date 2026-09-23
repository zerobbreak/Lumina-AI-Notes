import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { and, eq, inArray } from "drizzle-orm";
import type { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { files, notes } from "../db/schema/index.js";
import type { Env } from "../env.js";
import { createDeckWithCards, createDeckWithCardsImmediate } from "../flashcards/createDeck.js";
import { noteColumns, requireNote } from "../notes/access.js";
import { createDeckWithQuestions } from "../quizzes/createDeck.js";
import { searchFilesByEmbedding, searchNotesByEmbedding } from "../search/vectorSearch.js";
import { parse } from "../routes/validation.js";
import { currentUser } from "../middleware/user.js";
import { isOwnedKey, type Storage } from "../storage/s3.js";
import { applyLayeredLayout, layeredRanks } from "./diagram.js";
import { embedTextForVectorSearch } from "./embedding.js";
import { clientMessage, UserFacingError } from "./errors.js";
import { getGeminiModel, type GeminiModel } from "./gemini.js";

const TEXT_OP_CHARS = 100_000;
const GENERATION_CHARS = 1_000_000;
const rowId = z.string().min(1).max(200);

type Bit2Deps = {
  db: Db;
  env: Env;
  storage: Storage;
  model: (config?: { responseMimeType: string }) => GeminiModel;
};

async function requireOwnedFile(db: Db, fileId: string, userId: string) {
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .limit(1);
  if (!file) throw new UserFacingError("File not found");
  return file;
}

async function extractPdfBase64(storage: Storage, pdfBase64?: string, storageKey?: string) {
  if (pdfBase64) return pdfBase64;
  if (!storageKey) throw new UserFacingError("No PDF content provided");
  const bytes = await storage.getBytes(storageKey);
  return Buffer.from(bytes).toString("base64");
}

/** Port of convex/ai.ts Bit 2 actions. */
export function registerBit2Routes(router: Router, { db, env, storage, model }: Bit2Deps) {
  const requireGeminiKey = () => {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set");
    return apiKey;
  };

  router.post("/generate-embedding", async (req, res) => {
    const { text } = parse(z.object({ text: z.string().max(GENERATION_CHARS) }), req.body);
    const apiKey = requireGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
      const embedding = await embedTextForVectorSearch(genAI, text, TaskType.RETRIEVAL_DOCUMENT);
      res.json(embedding);
    } catch (error) {
      console.error("generateEmbedding error:", error);
      res.json(null);
    }
  });

  router.post("/semantic-search", async (req, res) => {
    const { query, limit } = parse(
      z.object({ query: z.string().trim().min(1).max(TEXT_OP_CHARS), limit: z.coerce.number().int().min(1).max(20).optional() }),
      req.body,
    );
    const user = currentUser(res);
    const apiKey = requireGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const queryEmbedding = await embedTextForVectorSearch(genAI, query, TaskType.RETRIEVAL_QUERY);
    if (!queryEmbedding) {
      res.json({ answer: "", sources: [] });
      return;
    }

    const hits = await searchNotesByEmbedding(db, user.id, queryEmbedding, limit ?? 5);
    const noteRows = hits.length
      ? await db
          .select({ id: notes.id, title: notes.title, content: notes.content })
          .from(notes)
          .where(inArray(notes.id, hits.map((h) => h.id)))
      : [];

    const byId = new Map(noteRows.map((n) => [n.id, n]));
    const ranked = hits
      .map((h) => {
        const note = byId.get(h.id);
        return note
          ? {
              id: note.id,
              title: note.title,
              content: note.content?.substring(0, 500) || "",
              score: h.score,
            }
          : null;
      })
      .filter(Boolean) as Array<{ id: string; title: string; content: string; score: number }>;

    if (ranked.length === 0) {
      res.json({
        answer:
          "I couldn't find relevant information in your notes. Try rephrasing your question or add more notes on this topic.",
        sources: [],
      });
      return;
    }

    const contextText = ranked.map((n) => `## ${n.title}\n${n.content}`).join("\n\n");
    const chatModel = model();
    const synthesisResult = await chatModel.generateContent(`Based on the following notes from a student's knowledge base, answer their question.

Notes Context:
${contextText}

Question: ${query}

Instructions:
- Answer based on the provided context
- If the context doesn't have enough info, say so
- Be concise and helpful
- Cite which notes the information came from`);
    res.json({
      answer: synthesisResult.response.text(),
      sources: ranked.map((n) => ({ id: n.id, title: n.title, score: n.score })),
    });
  });

  router.post("/unified-semantic-search", async (req, res) => {
    const { query, limit } = parse(
      z.object({ query: z.string().trim().min(1).max(TEXT_OP_CHARS), limit: z.coerce.number().int().min(1).max(20).optional() }),
      req.body,
    );
    const user = currentUser(res);
    const apiKey = requireGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const queryEmbedding = await embedTextForVectorSearch(genAI, query, TaskType.RETRIEVAL_QUERY);
    if (!queryEmbedding) {
      res.json({
        answer: "I couldn't process your search query. Try rephrasing with more specific terms.",
        sources: [],
      });
      return;
    }

    const max = limit ?? 5;
    const [noteHits, fileHits] = await Promise.all([
      searchNotesByEmbedding(db, user.id, queryEmbedding, max),
      searchFilesByEmbedding(db, user.id, queryEmbedding, max),
    ]);

    const noteRows = noteHits.length
      ? await db.select({ id: notes.id, title: notes.title, content: notes.content }).from(notes).where(inArray(notes.id, noteHits.map((h) => h.id)))
      : [];
    const fileRows = fileHits.length
      ? await db
          .select({ id: files.id, name: files.name, summary: files.summary, extractedText: files.extractedText })
          .from(files)
          .where(inArray(files.id, fileHits.map((h) => h.id)))
      : [];

    const noteById = new Map(noteRows.map((n) => [n.id, n]));
    const fileById = new Map(fileRows.map((f) => [f.id, f]));

    const noteSources = noteHits
      .map((h) => {
        const note = noteById.get(h.id);
        if (!note) return null;
        const snippet = note.content?.replace(/<[^>]*>/g, " ").substring(0, 200) || "";
        return {
          id: note.id,
          type: "note" as const,
          title: note.title,
          score: h.score,
          snippet,
          fullContent: note.content?.replace(/<[^>]*>/g, " ").substring(0, 1000) || "",
        };
      })
      .filter(Boolean) as Array<{ id: string; type: "note"; title: string; score: number; snippet: string; fullContent: string }>;

    const docSources = fileHits
      .map((h) => {
        const file = fileById.get(h.id);
        if (!file) return null;
        return {
          id: file.id,
          type: "document" as const,
          title: file.name,
          score: h.score,
          snippet: file.summary || file.extractedText?.substring(0, 200) || "",
          fullContent: file.extractedText?.substring(0, 1000) || "",
        };
      })
      .filter(Boolean) as Array<{ id: string; type: "document"; title: string; score: number; snippet: string; fullContent: string }>;

    const allSources = [...noteSources, ...docSources].sort((a, b) => b.score - a.score).slice(0, max);

    if (allSources.length === 0) {
      res.json({
        answer:
          "I couldn't find relevant information in your notes or documents. Try rephrasing your question or upload more materials on this topic.",
        sources: [],
      });
      return;
    }

    const contextText = allSources.map((s, i) => `[${i + 1}] ${s.title} (${s.type}):\n${s.fullContent}`).join("\n\n");
    const chatModel = model();
    const synthesisResult = await chatModel.generateContent(`Based on the following sources from a student's knowledge base, answer their question.
Include citation numbers like [1], [2] when referencing information from specific sources.

Sources:
${contextText}

Question: ${query}

Instructions:
- Answer based on the provided context
- Use [1], [2], etc. to cite which source the information came from
- If the context doesn't have enough info, say so
- Be concise and helpful`);
    res.json({
      answer: synthesisResult.response.text(),
      sources: allSources.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        score: s.score,
        snippet: s.snippet,
      })),
    });
  });

  router.post("/generate-course-roadmap", async (req, res) => {
    const { major, courses } = parse(
      z.object({ major: z.string().trim().min(1).max(100), courses: z.array(z.string().trim().min(1).max(200)).min(1).max(50) }),
      req.body,
    );
    const gemini = model();
    const prompt = `You are an academic advisor. Create a visual learning roadmap (mind map) for a student majoring in "${major}".
    
    Courses: ${courses.join(", ")}

    Generate a node-graph JSON structure representing the relationships between these courses and key concepts they cover.

    Return EXACTLY this JSON structure:
    {
      "nodes": [
        { "id": "1", "type": "concept", "data": { "label": "${major}", "color": "bg-gradient-to-br from-purple-500 to-pink-500" }, "position": { "x": 400, "y": 50 } }
      ],
      "edges": [{ "id": "e1-2", "source": "1", "target": "2", "animated": true }]
    }

    Rules:
    - The central node (id: "1") should be the Major with type "concept"
    - Use node types: "concept", "topic", "subtopic", "note"
    - Assign colors based on node type
    - Create 8-12 nodes total
    - Return ONLY valid JSON, no markdown code fences.`;

    try {
      const result = await gemini.generateContent(prompt);
      let text = result.response.text().trim().replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new UserFacingError("Failed to generate roadmap JSON");
      const data = JSON.parse(match[0]) as {
        nodes: Array<{ id: string; type: string; data: { label: string; color: string }; position: { x: number; y: number } }>;
        edges: Array<{ id: string; source: string; target: string; animated?: boolean }>;
      };
      if (data.nodes?.length) {
        data.nodes = applyLayeredLayout(data.nodes, data.edges ?? [], layeredRanks(data.nodes.map((n) => n.id), data.edges ?? []));
      }
      res.json(data);
    } catch (e) {
      console.error("Roadmap generation failed", e);
      const nodes = [
        {
          id: "1",
          type: "concept",
          data: { label: major, color: "bg-gradient-to-br from-purple-500 to-pink-500" },
          position: { x: 400, y: 50 },
        },
      ];
      const edges: Array<{ id: string; source: string; target: string; animated: boolean }> = [];
      courses.forEach((course, index) => {
        const nodeId = `${index + 2}`;
        nodes.push({
          id: nodeId,
          type: "topic",
          data: { label: course, color: "bg-gradient-to-br from-blue-500 to-cyan-500" },
          position: { x: 200 + (index % 3) * 200, y: 200 + Math.floor(index / 3) * 150 },
        });
        edges.push({ id: `e1-${nodeId}`, source: "1", target: nodeId, animated: true });
      });
      res.json({ nodes, edges });
    }
  });

  router.post("/ask-about-file", async (req, res) => {
    const { fileId, question } = parse(
      z.object({ fileId: rowId, question: z.string().trim().min(1).max(TEXT_OP_CHARS) }),
      req.body,
    );
    try {
      const file = await requireOwnedFile(db, fileId, currentUser(res).id);
      if (!file.extractedText) {
        res.json({
          success: false,
          error: "This file hasn't been processed yet. Please wait for processing to complete.",
        });
        return;
      }
      const gemini = model();
      const result = await gemini.generateContent(`You are Lumina AI, a helpful academic assistant. Answer the following question based ONLY on the provided document content.

Document: "${file.name}"
Content:
"""
${file.extractedText.substring(0, 15000)}
"""

Question: ${question}

Instructions:
- Answer based ONLY on the provided document content
- If the document doesn't contain information to answer the question, say so clearly
- Be concise but thorough
- Format your response with markdown for clarity`);
      res.json({ success: true, answer: result.response.text() });
    } catch (error) {
      console.error("askAboutFile error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to answer question") });
    }
  });

  router.post("/get-document-reference", async (req, res) => {
    const { fileId, currentNoteContent } = parse(
      z.object({ fileId: rowId, currentNoteContent: z.string().max(GENERATION_CHARS).optional(), maxLength: z.number().int().optional() }),
      req.body,
    );
    try {
      const file = await requireOwnedFile(db, fileId, currentUser(res).id);
      if (file.processingStatus !== "done" || !file.extractedText) {
        throw new UserFacingError("Document not yet processed");
      }
      const context = currentNoteContent?.replace(/<[^>]*>/g, " ") || "";
      const gemini = model();
      const prompt =
        context.trim().length > 50
          ? `Given the current note context and a source document, extract the most relevant information.

Current Note Context:
"""
${context.substring(0, 2000)}
"""

Source Document "${file.name}":
"""
${file.extractedText.substring(0, 10000)}
"""

Return a JSON response:
{
  "summary": "2-3 sentence summary of relevant content",
  "relevantExcerpts": ["excerpt 1", "excerpt 2", "excerpt 3"],
  "citation": "Brief citation format"
}

Return ONLY valid JSON.`
          : `Extract key information from this document.

Source Document "${file.name}":
"""
${file.extractedText.substring(0, 10000)}
"""

Return a JSON response:
{
  "summary": "2-3 sentence summary of the document",
  "relevantExcerpts": ["key point 1", "key point 2", "key point 3"],
  "citation": "${file.name}"
}

Return ONLY valid JSON.`;
      const result = await gemini.generateContent(prompt);
      const jsonMatch = result.response.text().trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new UserFacingError("Failed to parse AI response");
      const parsed = JSON.parse(jsonMatch[0]) as {
        summary?: string;
        relevantExcerpts?: string[];
        citation?: string;
      };
      res.json({
        success: true,
        reference: {
          summary: parsed.summary || file.summary || "",
          relevantExcerpts: parsed.relevantExcerpts || [],
          citation: parsed.citation || file.name,
        },
      });
    } catch (error) {
      console.error("getDocumentReference error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to get reference") });
    }
  });

  router.post("/generate-notes-from-document", async (req, res) => {
    const { fileId, topic, noteStyle } = parse(
      z.object({ fileId: rowId, topic: z.string().max(200).optional(), noteStyle: z.string().max(50).optional() }),
      req.body,
    );
    try {
      const file = await requireOwnedFile(db, fileId, currentUser(res).id);
      if (file.processingStatus !== "done" || !file.extractedText) {
        throw new UserFacingError("Document not yet processed. Please wait for processing to complete.");
      }
      const style = noteStyle || "detailed";
      const styleInstructions: Record<string, string> = {
        summary: "Create a concise summary with key takeaways (1-2 paragraphs max)",
        detailed: "Create comprehensive study notes with explanations and examples",
        "bullet-points": "Use organized bullet points with clear hierarchy",
        sections: "Use section-based format with headings and organized content blocks",
      };
      const topicFocus = topic
        ? `Focus specifically on information related to: "${topic}"`
        : "Cover the main topics comprehensively";
      const gemini = model();
      const result = await gemini.generateContent(`You are an expert academic note-taker. Generate structured study notes from this document.

Document: "${file.name}"
Document Summary: ${file.summary || ""}
Key Topics: ${(file.keyTopics || []).join(", ")}

Full Document Content:
"""
${file.extractedText.substring(0, 20000)}
"""

Instructions:
- ${styleInstructions[style] || styleInstructions.detailed}
- ${topicFocus}
- Include the most important concepts, definitions, and details
- Use proper markdown formatting
- Add a "Source" reference at the end: [Source: ${file.name}]`);
      const generatedContent = result.response.text();
      const titleResult = await gemini.generateContent(`Based on these notes, generate a short, descriptive title (max 8 words):
      
${generatedContent.substring(0, 500)}

Return ONLY the title, no quotes or explanation.`);
      const title = titleResult.response
        .text()
        .trim()
        .replace(/^["']|["']$/g, "");
      res.json({
        success: true,
        content: generatedContent,
        title: title || `Notes from ${file.name}`,
        sourceDocument: { id: file.id, name: file.name },
      });
    } catch (error) {
      console.error("generateNotesFromDocument error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to generate notes") });
    }
  });

  router.post("/improve-note-with-documents", async (req, res) => {
    const { noteId, documentIds, instruction } = parse(
      z.object({
        noteId: rowId,
        documentIds: z.array(rowId).min(1).max(20),
        instruction: z.string().max(TEXT_OP_CHARS).optional(),
      }),
      req.body,
    );
    try {
      const user = currentUser(res);
      const { note } = await requireNote(db, noteId, user.id, "edit");
      const noteContent = note.content?.replace(/<[^>]*>/g, " ") || "";
      const ownedFiles = await db
        .select()
        .from(files)
        .where(and(eq(files.userId, user.id), inArray(files.id, documentIds)));
      const validDocs = ownedFiles
        .filter((f) => f.extractedText)
        .map((f) => ({
          id: f.id,
          name: f.name,
          content: f.extractedText!.substring(0, 5000),
          summary: f.summary || "",
        }));
      if (validDocs.length === 0) {
        throw new UserFacingError("No processed documents found. Please wait for document processing to complete.");
      }
      const docContext = validDocs
        .map((d, i) => `[${i + 1}] ${d.name}:\nSummary: ${d.summary}\nContent: ${d.content}`)
        .join("\n\n---\n\n");
      const gemini = model();
      const result = await gemini.generateContent(`You are a helpful academic assistant. ${instruction || "Enhance and expand the note content using information from the linked documents"}

Current note content:
"""
${noteContent}
"""

Reference documents:
${docContext}

Instructions:
- Enhance the note with relevant information from the documents
- Add citation markers [1], [2], etc.
- Keep the original structure and add new details where appropriate
- Return ONLY the improved note content, no explanations`);
      res.json({
        success: true,
        improvedContent: result.response.text(),
        citations: validDocs.map((d, i) => ({ marker: `[${i + 1}]`, documentId: d.id, documentName: d.name })),
      });
    } catch (error) {
      console.error("improveNoteWithDocuments error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to improve note") });
    }
  });

  router.post("/generate-and-save-flashcards", async (req, res) => {
    const { noteId, title, count } = parse(
      z.object({ noteId: rowId, title: z.string().trim().min(1).max(500), count: z.coerce.number().int().min(1).max(50).optional() }),
      req.body,
    );
    try {
      const user = currentUser(res);
      const { note } = await requireNote(db, noteId, user.id, "view");
      const plainText = (note.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (plainText.length < 50) {
        res.json({
          success: false,
          error: "This note doesn't have enough content yet. Add more text to your note before generating flashcards.",
        });
        return;
      }
      const gemini = model({ responseMimeType: "application/json" });
      const cardCount = count ?? 10;
      const result = await gemini.generateContent(`Generate ${cardCount} flashcards from the following study content.

Content:
"""
${plainText.substring(0, 8000)}
"""

Return a JSON array: [{"front": "Question", "back": "Answer"}]
Return ONLY valid JSON.`);
      const jsonMatch = result.response.text().trim().match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new UserFacingError("Failed to parse AI response");
      const cards = JSON.parse(jsonMatch[0]) as Array<{ front: string; back: string }>;
      if (!cards.length) throw new UserFacingError("No flashcards generated");
      const deckId = await createDeckWithCards(db, user.id, {
        title,
        sourceNoteId: noteId,
        courseId: note.courseId ?? undefined,
        cards,
      });
      res.json({ success: true, deckId, cardCount: cards.length });
    } catch (error) {
      console.error("generateAndSaveFlashcards error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to generate flashcards") });
    }
  });

  router.post("/generate-and-save-quiz", async (req, res) => {
    const { noteId, title, count } = parse(
      z.object({ noteId: rowId, title: z.string().trim().min(1).max(500), count: z.coerce.number().int().min(1).max(30).optional() }),
      req.body,
    );
    try {
      const user = currentUser(res);
      const { note } = await requireNote(db, noteId, user.id, "view");
      const plainText = (note.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (plainText.length < 50) {
        res.json({ success: false, error: "This note doesn't have enough content yet." });
        return;
      }
      const gemini = model({ responseMimeType: "application/json" });
      const questionCount = count ?? 5;
      const result = await gemini.generateContent(`Generate ${questionCount} multiple-choice quiz questions from this content.

Content:
"""
${plainText.substring(0, 8000)}
"""

Return JSON array:
[{"question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "..."}]
Return ONLY valid JSON.`);
      const jsonMatch = result.response.text().trim().match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new UserFacingError("Failed to parse AI response");
      const questions = JSON.parse(jsonMatch[0]) as Array<{
        question: string;
        options: string[];
        correctAnswer: number;
        explanation?: string;
      }>;
      const deckId = await createDeckWithQuestions(db, user.id, {
        title,
        sourceNoteId: noteId,
        courseId: note.courseId ?? undefined,
        questions,
      });
      res.json({ success: true, deckId, questionCount: questions.length });
    } catch (error) {
      console.error("generateAndSaveQuiz error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to generate quiz") });
    }
  });

  router.post("/ingest-and-generate-flashcards", async (req, res) => {
    const body = parse(
      z.object({
        pdfBase64: z.string().max(GENERATION_CHARS).optional(),
        storageKey: z.string().max(1024).optional(),
        fileName: z.string().trim().min(1).max(500),
        courseId: rowId.optional(),
        cardCount: z.coerce.number().int().min(1).max(50).optional(),
      }),
      req.body,
    );
    try {
      const user = currentUser(res);
      if (body.storageKey && !isOwnedKey(user.clerkUserId, body.storageKey)) {
        throw new UserFacingError("File not found in storage");
      }
      const apiKey = requireGeminiKey();
      const pdfBase64 = await extractPdfBase64(storage, body.pdfBase64, body.storageKey);
      const pdfModel = getGeminiModel(apiKey);
      const extractionResult = await pdfModel.generateContent([
        { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
        { text: "Extract complete text from this PDF for flashcard generation. Return ONLY the extracted text with markdown structure." },
      ]);
      const extractedText = extractionResult.response.text().trim();
      if (extractedText.length < 50) throw new UserFacingError("Could not extract sufficient text from PDF");
      const count = body.cardCount ?? 10;
      const flashcardResult = await pdfModel.generateContent(`[Context: ${extractedText.substring(0, 15000)}]

Generate ${count} flashcards. Return JSON array [{"front":"...","back":"..."}] ONLY.`);
      const jsonMatch = flashcardResult.response.text().trim().match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new UserFacingError("Failed to parse flashcard response from AI");
      const cards = JSON.parse(jsonMatch[0]) as Array<{ front: string; back: string }>;
      const deckId = await createDeckWithCardsImmediate(db, user.id, {
        title: body.fileName.replace(/\.pdf$/i, "") + " - Quick Cards",
        sourceFileName: body.fileName,
        courseId: body.courseId,
        cards,
      });
      res.json({ success: true, deckId, cardCount: cards.length });
    } catch (error) {
      console.error("ingestAndGenerateFlashcards error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to generate flashcards from PDF") });
    }
  });

  router.post("/ingest-and-generate-note", async (req, res) => {
    const body = parse(
      z.object({
        pdfBase64: z.string().max(GENERATION_CHARS).optional(),
        storageKey: z.string().max(1024).optional(),
        fileName: z.string().trim().min(1).max(500),
        courseId: rowId.optional(),
      }),
      req.body,
    );
    try {
      const user = currentUser(res);
      if (body.storageKey && !isOwnedKey(user.clerkUserId, body.storageKey)) {
        throw new UserFacingError("File not found in storage");
      }
      const apiKey = requireGeminiKey();
      const pdfBase64 = await extractPdfBase64(storage, body.pdfBase64, body.storageKey);
      const pdfModel = getGeminiModel(apiKey);
      const noteGenerationResult = await pdfModel.generateContent([
        { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
        {
          text: `Analyze this PDF and create exam-ready study notes. Return JSON: {"title":"...","content":"HTML notes..."}. Return ONLY valid JSON.`,
        },
      ]);
      const jsonMatch = noteGenerationResult.response.text().trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new UserFacingError("Failed to parse note generation response");
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; content?: string };
      const now = new Date();
      const [created] = await db
        .insert(notes)
        .values({
          userId: user.id,
          title: parsed.title || body.fileName.replace(/\.pdf$/i, ""),
          content: parsed.content || "",
          noteType: body.courseId ? "page" : "quick",
          courseId: body.courseId,
          lastAccessedAt: now,
        })
        .returning(noteColumns);
      res.json({ success: true, noteId: created.id, title: created.title });
    } catch (error) {
      console.error("ingestAndGenerateNote error:", error);
      res.json({ success: false, error: clientMessage(error, "Failed to generate note from PDF") });
    }
  });
}
