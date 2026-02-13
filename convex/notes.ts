import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

type NoteRole = "owner" | "editor" | "viewer";

type TranscriptChunkInput = {
  text?: string;
  enhancedText?: string;
  timestamp?: string;
};

const normalizeTranscriptForPrompt = (rawTranscript: string): string => {
  const fallback = rawTranscript.trim();
  if (!fallback) return "";

  try {
    const parsed = JSON.parse(rawTranscript) as unknown;
    if (!Array.isArray(parsed)) return fallback;

    const lines = parsed
      .map((chunk) => {
        const entry = chunk as TranscriptChunkInput;
        const content = (entry.enhancedText || entry.text || "").trim();
        if (!content) return "";
        const stamp = (entry.timestamp || "").trim();
        return stamp ? `[${stamp}] ${content}` : content;
      })
      .filter((line) => line.length > 0);

    if (lines.length === 0) return fallback;
    return lines.join("\n");
  } catch {
    return fallback;
  }
};

/**
 * Enrich a sparse or fragmented transcript by using AI to reconstruct
 * a coherent, comprehensive narrative. Improves downstream note quality.
 */
const enrichTranscriptForPinned = async (
  model: any,
  normalizedTranscript: string,
  contextText: string,
): Promise<string> => {
  const wordCount = normalizedTranscript.split(/\s+/).length;
  if (wordCount > 500) return normalizedTranscript;

  const enrichPrompt = `You are an expert lecture reconstruction assistant. The following transcript was captured from a live lecture recording using browser speech recognition, which often produces fragmented, incomplete sentences.

Your job is to reconstruct this into a coherent, comprehensive lecture narrative. You must:
1. Fix any fragmented or incomplete sentences into proper, full sentences
2. Infer and fill in likely context that speech recognition may have missed
3. Expand abbreviated or unclear references into full explanations
4. Maintain ALL original facts, concepts, examples, and terminology
5. Add logical connectors and transitions between ideas
6. Use the provided reference document context to better understand the subject matter and add appropriate academic depth

${
  contextText
    ? `Reference document context (use this to understand the subject area):
"""
${contextText.substring(0, 3000)}
"""`
    : ""
}

Original fragmented transcript:
"""
${normalizedTranscript}
"""

Return ONLY the reconstructed, enriched transcript as plain text. Do not add headers, labels, or meta-commentary.`;

  try {
    const result = await model.generateContent(enrichPrompt);
    const enrichedText = result.response.text().trim();
    if (enrichedText.length > normalizedTranscript.length * 1.3) {
      return enrichedText;
    }
    return normalizedTranscript;
  } catch {
    return normalizedTranscript;
  }
};

async function getNoteRole(
  ctx: any,
  noteId: any,
  userId: string,
): Promise<NoteRole | null> {
  const note = await ctx.db.get(noteId);
  if (!note) return null;
  if (note.userId === userId) return "owner";
  const collab = await ctx.db
    .query("noteCollaborators")
    .withIndex("by_noteId_userId", (q: any) =>
      q.eq("noteId", noteId).eq("userId", userId),
    )
    .unique();
  if (!collab) return null;
  return collab.role as "editor" | "viewer";
}

async function requireNoteAccess(ctx: any, noteId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const role = await getNoteRole(ctx, noteId, identity.tokenIdentifier);
  if (!role) throw new Error("Unauthorized");
  const note = await ctx.db.get(noteId);
  if (!note) throw new Error("Note not found");
  return { identity, role, note };
}

async function requireNoteEdit(ctx: any, noteId: any) {
  const { identity, role, note } = await requireNoteAccess(ctx, noteId);
  if (role !== "owner" && role !== "editor") throw new Error("Forbidden");
  return { identity, role, note };
}

async function requireNoteOwner(ctx: any, noteId: any) {
  const { identity, role, note } = await requireNoteAccess(ctx, noteId);
  if (role !== "owner") throw new Error("Forbidden");
  return { identity, note };
}

export const createNote = mutation({
  args: {
    title: v.string(),
    major: v.optional(v.string()),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
    parentNoteId: v.optional(v.id("notes")),
    style: v.optional(v.string()),
    noteType: v.optional(v.string()), // "quick" | "page"
    tagIds: v.optional(v.array(v.id("tags"))),
    wordCount: v.optional(v.number()),
    content: v.optional(v.string()),
    quickCaptureType: v.optional(v.string()),
    quickCaptureAudioUrl: v.optional(v.string()),
    quickCaptureStatus: v.optional(v.string()),
    quickCaptureExpandedNoteId: v.optional(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called createNote without authentication present");
    }

    // Determine noteType: if courseId or moduleId is provided, it's a "page", otherwise "quick"
    const noteType =
      args.noteType || (args.courseId || args.moduleId ? "page" : "quick");

    const noteId = await ctx.db.insert("notes", {
      userId: identity.tokenIdentifier,
      title: args.title,
      noteType,
      major: args.major,
      courseId: args.courseId,
      moduleId: args.moduleId,
      parentNoteId: args.parentNoteId,
      style: args.style || "standard",
      content: args.content ?? "",
      isPinned: false,
      tagIds: args.tagIds || [],
      wordCount: args.wordCount || 0,
      createdAt: Date.now(),
      quickCaptureType: args.quickCaptureType,
      quickCaptureAudioUrl: args.quickCaptureAudioUrl,
      quickCaptureStatus: args.quickCaptureStatus,
      quickCaptureExpandedNoteId: args.quickCaptureExpandedNoteId,
    });

    return noteId;
  },
});

// Get quick notes only (for sidebar Quick Notes section)
export const getQuickNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const ownedNotes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) =>
        q.and(
          q.neq(q.field("isArchived"), true),
          // Quick notes: noteType is "quick" OR (noteType is undefined AND no courseId/moduleId)
          q.or(
            q.eq(q.field("noteType"), "quick"),
            q.and(
              q.eq(q.field("noteType"), undefined),
              q.eq(q.field("courseId"), undefined),
              q.eq(q.field("moduleId"), undefined),
            ),
          ),
        ),
      )
      .order("desc")
      .take(10);

    // Also include quick notes shared with the user.
    const collabs = await ctx.db
      .query("noteCollaborators")
      .withIndex("by_userId", (q: any) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();

    const sharedNotes = [];
    for (const c of collabs) {
      const n = await ctx.db.get(c.noteId);
      if (!n) continue;
      if (n.isArchived) continue;
      const isQuick =
        n.noteType === "quick" ||
        (n.noteType === undefined &&
          n.courseId === undefined &&
          n.moduleId === undefined);
      if (isQuick) sharedNotes.push(n);
    }

    const combined = [...ownedNotes, ...sharedNotes]
      .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 10);

    return combined;
  },
});

// Legacy: Get recent notes (all types) for backwards compatibility
export const getRecentNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const ownedNotes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc") // Most recent first
      .take(20);

    const collabs = await ctx.db
      .query("noteCollaborators")
      .withIndex("by_userId", (q: any) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();

    const sharedNotes = [];
    for (const c of collabs) {
      const n = await ctx.db.get(c.noteId);
      if (!n) continue;
      if (n.isArchived) continue;
      sharedNotes.push(n);
    }

    const combined = [...ownedNotes, ...sharedNotes]
      .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 5);

    return combined;
  },
});

export const getArchivedNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    return notes;
  },
});

export const getNotesByContext = query({
  args: {
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.moduleId) {
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId!))
        .collect();
      const accessible = [];
      for (const n of notes) {
        const role = await getNoteRole(ctx, n._id, identity.tokenIdentifier);
        if (role) accessible.push(n);
      }
      return accessible;
    }

    if (args.courseId) {
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId!))
        .collect();
      const accessible = [];
      for (const n of notes) {
        const role = await getNoteRole(ctx, n._id, identity.tokenIdentifier);
        if (role) accessible.push(n);
      }
      return accessible;
    }

    return [];
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const { identity, role } = await requireNoteAccess(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");

    await ctx.db.delete(args.noteId);
  },
});

export const toggleArchiveNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const { note, role } = await requireNoteAccess(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");
    // If it doesn't have isArchived field yet, treat as false -> true
    const currentArchived = note.isArchived ?? false;
    await ctx.db.patch(args.noteId, { isArchived: !currentArchived });
  },
});

export const togglePinNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const { note, role } = await requireNoteAccess(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");
    const currentPinned = note.isPinned ?? false;
    await ctx.db.patch(args.noteId, { isPinned: !currentPinned });
  },
});

export const getPinnedNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId_and_pinned", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("isPinned", true),
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .take(20);

    return notes;
  },
});

export const renameNote = mutation({
  args: { noteId: v.id("notes"), title: v.string() },
  handler: async (ctx, args) => {
    const { role } = await requireNoteEdit(ctx, args.noteId);
    // Allow owners + editors to rename (shared editing experience)

    await ctx.db.patch(args.noteId, { title: args.title });
  },
});

export const getNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const role = await getNoteRole(ctx, args.noteId, identity.tokenIdentifier);
    if (!role) return null;
    return await ctx.db.get(args.noteId);
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    style: v.optional(v.string()),
    // Cornell Notes specific fields
    cornellCues: v.optional(v.string()),
    cornellNotes: v.optional(v.string()),
    cornellSummary: v.optional(v.string()),
    // Outline Mode specific fields
    outlineData: v.optional(v.string()),
    outlineMetadata: v.optional(
      v.object({
        totalItems: v.number(),
        completedTasks: v.number(),
        collapsedNodes: v.array(v.string()),
      }),
    ),
    tagIds: v.optional(v.array(v.id("tags"))),
    wordCount: v.optional(v.number()),
    quickCaptureType: v.optional(v.string()),
    quickCaptureAudioUrl: v.optional(v.string()),
    quickCaptureStatus: v.optional(v.string()),
    quickCaptureExpandedNoteId: v.optional(v.id("notes")),
  },
  handler: async (ctx, args) => {
    await requireNoteEdit(ctx, args.noteId);

    const patch: any = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    if (args.style !== undefined) patch.style = args.style;
    if (args.cornellCues !== undefined) patch.cornellCues = args.cornellCues;
    if (args.cornellNotes !== undefined) patch.cornellNotes = args.cornellNotes;
    if (args.cornellSummary !== undefined)
      patch.cornellSummary = args.cornellSummary;
    if (args.outlineData !== undefined) patch.outlineData = args.outlineData;
    if (args.outlineMetadata !== undefined)
      patch.outlineMetadata = args.outlineMetadata;
    if (args.tagIds !== undefined) patch.tagIds = args.tagIds;
    if (args.wordCount !== undefined) patch.wordCount = args.wordCount;
    if (args.quickCaptureType !== undefined)
      patch.quickCaptureType = args.quickCaptureType;
    if (args.quickCaptureAudioUrl !== undefined)
      patch.quickCaptureAudioUrl = args.quickCaptureAudioUrl;
    if (args.quickCaptureStatus !== undefined)
      patch.quickCaptureStatus = args.quickCaptureStatus;
    if (args.quickCaptureExpandedNoteId !== undefined)
      patch.quickCaptureExpandedNoteId = args.quickCaptureExpandedNoteId;

    await ctx.db.patch(args.noteId, patch);
  },
});

export const toggleShareNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const { note, role } = await requireNoteAccess(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");

    const currentShared = note.isShared ?? false;
    await ctx.db.patch(args.noteId, { isShared: !currentShared });
    return !currentShared;
  },
});

export const getPublicNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || !note.isShared) {
      return null;
    }
    return note;
  },
});

/**
 * Link documents to a note for reference/citation purposes
 */
export const linkDocuments = mutation({
  args: {
    noteId: v.id("notes"),
    documentIds: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const { note, role } = await requireNoteEdit(ctx, args.noteId);
    // Only owners can manage linked documents for now (reduces shared-state surprises)
    if (role !== "owner") throw new Error("Forbidden");

    const existingIds = note.linkedDocumentIds || [];
    const newIds = [...new Set([...existingIds, ...args.documentIds])];

    await ctx.db.patch(args.noteId, { linkedDocumentIds: newIds });
    return newIds;
  },
});

/**
 * Unlink a document from a note
 */
export const unlinkDocument = mutation({
  args: {
    noteId: v.id("notes"),
    documentId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const { note, role } = await requireNoteEdit(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");

    const existingIds = note.linkedDocumentIds || [];
    const newIds = existingIds.filter((id: any) => id !== args.documentId);

    await ctx.db.patch(args.noteId, { linkedDocumentIds: newIds });
    return newIds;
  },
});

/**
 * Helper query to fetch documents by their IDs (for use in actions)
 */
export const getDocumentsByIds = query({
  args: { documentIds: v.array(v.id("files")) },
  handler: async (ctx, args) => {
    const docs = await Promise.all(
      args.documentIds.map((id) => ctx.db.get(id)),
    );
    return docs.filter((doc) => doc !== null);
  },
});

/**
 * Generate structured notes from transcript with context from a pinned file
 * Uses vector search to find relevant chunks from the pinned document
 */
export const generateFromPinnedAudio = action({
  args: { transcript: v.string(), pinnedFileId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    const tryParseJson = (text: string) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    };

    const fixJson = async (text: string) => {
      const fixPrompt = `Fix the following JSON. Return ONLY valid JSON with the same structure and content, no markdown.

JSON:
${text}`;
      const fixResult = await model.generateContent(fixPrompt);
      return fixResult.response.text().trim();
    };

    const normalizedTranscript = normalizeTranscriptForPrompt(args.transcript);

    const sentenceCount = (text: string) =>
      text
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0).length;

    const wordCountFn = (text: string) =>
      text.split(/\s+/).filter((w) => w.length > 0).length;

    const noteLacksDepth = (text: string) => {
      const lower = text.toLowerCase();
      const words = wordCountFn(text);
      const sentences = sentenceCount(text);
      const genericSignals = [
        "will be explored",
        "in future",
        "important concept",
        "key point",
        "topic is",
        "it is important",
        "this concept",
        "students should",
        "further study",
        "as mentioned",
      ];
      const hasGenericSignal = genericSignals.some((sig) =>
        lower.includes(sig),
      );
      const hasConcreteSignal =
        /\d/.test(text) ||
        /(for example|e\.g\.|such as|because|therefore|used to|works by|defined as|means|specifically|in particular|according to|demonstrated by|calculated as|results in|consists of|involves)/i.test(
          text,
        );
      return (
        sentences < 3 || words < 40 || hasGenericSignal || !hasConcreteSignal
      );
    };

    const maybeRepairQuality = async (
      draft: unknown,
      enrichedTranscript: string,
    ) => {
      const draftText = JSON.stringify(draft);
      const repairPrompt = `You are a quality assurance specialist improving generated Cornell lecture notes. The current notes are too shallow and lack substantive content.

Original transcript:
"""
${enrichedTranscript}
"""

Pinned document context (use for additional depth):
"""
${contextText}
"""

Current JSON (needs improvement):
${draftText}

Your task: Rewrite ALL cornell notes to be substantially more detailed and informative.

Return JSON with EXACT keys:
{
  "summary": "5-8 sentence comprehensive summary",
  "cornellCues": ["Specific term/concept 1", ...],
  "cornellNotes": ["Detailed 5-8 sentence explanation 1", ...],
  "actionItems": ["..."],
  "reviewQuestions": ["..."],
  "diagramNodes": ["..."],
  "diagramEdges": ["..."]
}

STRICT quality requirements:
- 6-8 cue/note pairs
- cornellNotes[i] must thoroughly explain cornellCues[i]
- Each cornell note MUST be 5-8 sentences (80-120 words minimum)
- Each note must follow: Definition → How it works → Specific example → Why it matters
- Each note must include at least ONE concrete detail from transcript or pinned document
- NEVER use generic filler phrases
- Every sentence must add NEW information
- Cross-reference pinned document content where relevant
- Return ONLY valid JSON`;

      const repairedResult = await model.generateContent(repairPrompt);
      const repairedText = repairedResult.response.text().trim();
      const parsedRepair = tryParseJson(repairedText);
      if (parsedRepair) return parsedRepair;

      const fixedRepairText = await fixJson(repairedText);
      return tryParseJson(fixedRepairText);
    };

    // 1. Embed the transcript
    const embeddingResult =
      await embeddingModel.embedContent(normalizedTranscript);
    const transcriptEmbedding = embeddingResult.embedding.values;

    // 2. Search the pinned file (or all documents if no pin)
    let relevantDocs: Array<{ _id: any; _score: number }> = [];
    if (args.pinnedFileId) {
      relevantDocs = await ctx.vectorSearch("documents", "by_embedding", {
        vector: transcriptEmbedding,
        filter: (q: any) => q.eq("storageId", args.pinnedFileId),
        limit: 5,
      });
    } else {
      relevantDocs = await ctx.vectorSearch("documents", "by_embedding", {
        vector: transcriptEmbedding,
        limit: 5,
      });
    }

    // 3. Fetch the actual document texts
    let contextText = "";
    if (relevantDocs.length > 0) {
      const docIds = relevantDocs.map((d) => d._id);
      const documents = await ctx.runQuery(api.notes.getDocumentsByIds, {
        documentIds: docIds,
      });
      contextText = documents.map((doc: any) => doc.text).join("\n\n---\n\n");
    }

    // 4. Enrich the transcript before note generation
    const enrichedTranscript = await enrichTranscriptForPinned(
      model,
      normalizedTranscript,
      contextText,
    );

    // 5. Generate structured notes with context
    const contextSection = contextText
      ? `\n\nRelevant Context from Pinned Document:\n"""\n${contextText}\n"""\n\nIMPORTANT: Cross-reference the transcript with this pinned document. Use specific information, definitions, formulas, and examples from the document to enrich your notes. Cite document content when it adds depth to concepts mentioned in the lecture.`
      : "";

    const prompt = `You are a world-class academic note-taker and subject matter expert. You create comprehensive, exam-ready study materials that students rely on as their PRIMARY study resource.

Your goal: Create notes so thorough and detailed that a student who MISSED the lecture could study ONLY from your notes and still perform excellently on an exam.${contextSection}

Transcript:
"""
${enrichedTranscript}
"""

CRITICAL CONTEXT: This transcript was captured via voice recording and may be fragmented or incomplete. You MUST:
- Reconstruct incomplete explanations into full, coherent concepts
- Add relevant academic context from the pinned document
- Infer and include underlying theory, definitions, and frameworks
- Provide textbook-level depth for each concept mentioned

Generate a JSON response with this EXACT structure:
{
  "summary": "A comprehensive 5-8 sentence summary that: 1) Opens with the EXACT main topic, 2) Explains WHY this topic matters, 3) Lists ALL key themes covered, 4) Highlights the most important findings/theories, 5) Concludes with key takeaways.",
  "cornellCues": ["Precise Concept 1", "Precise Concept 2", "Precise Concept 3", "Precise Concept 4", "Precise Concept 5", "Precise Concept 6", "Precise Concept 7"],
  "cornellNotes": [
    "PARAGRAPH: Start with a precise DEFINITION. Explain the mechanism/process in 2-3 sentences. Provide a SPECIFIC example with concrete details (numbers, names, formulas). Explain significance and connections. (Minimum 5 sentences, ~80-120 words)",
    "Each note follows the same structure: Definition → Mechanism → Specific Example → Significance. (Minimum 5 sentences, ~80-120 words)",
    "Continue pattern. NO generic filler. Every sentence adds new information. (Minimum 5 sentences, ~80-120 words)",
    "Include formulas, classifications, or frameworks from transcript/document. (Minimum 5 sentences, ~80-120 words)",
    "Cover real-world applications, historical context, or comparisons. (Minimum 5 sentences, ~80-120 words)",
    "Address nuances, exceptions, or common misconceptions. (Minimum 5 sentences, ~80-120 words)",
    "Explain relationships between concepts and connections to broader field. (Minimum 5 sentences, ~80-120 words)"
  ],
  "actionItems": ["Task 1", "Task 2"],
  "reviewQuestions": [
    "Definition question about a key concept?",
    "Mechanism question: Explain the process of X step by step.",
    "Application question: How would you apply X to Y?",
    "Comparison question: Compare X and Y.",
    "Analysis question requiring deeper thinking?",
    "Synthesis question connecting multiple concepts?",
    "Evaluation question about strengths/limitations?"
  ],
  "diagramNodes": ["Central Topic", "Key Concept A", "Key Concept B", "Key Concept C", "Sub-concept A1", "Sub-concept A2", "Sub-concept B1", "Sub-concept C1", "Related Framework"],
  "diagramEdges": ["0-1", "0-2", "0-3", "1-4", "1-5", "2-6", "3-7", "0-8"]
}

MANDATORY QUALITY REQUIREMENTS:
- cornellCues: Generate 6-8 specific academic terms or focused questions
- cornellNotes: THIS IS THE MOST IMPORTANT PART. Each note MUST be:
  * A SUBSTANTIAL paragraph of 5-8 sentences (80-120 words minimum)
  * Structured as: Definition → Mechanism/Process → Specific Example → Significance
  * Include at LEAST one concrete detail from the transcript or pinned document
  * Written as if explaining to a student who wasn't in the lecture
  * Free of generic filler phrases
- cornellNotes[i] MUST directly explain cornellCues[i]
- If pinned document provides additional depth, INCORPORATE it into relevant notes
- reviewQuestions: Create 5-7 varied questions spanning Bloom's taxonomy
- diagramNodes: Create 7-10 nodes showing concept hierarchy
- diagramEdges: Connect nodes logically (format: "sourceIndex-targetIndex")
- actionItems: Only include explicitly mentioned tasks (empty array if none)
- Return ONLY valid JSON, no markdown code fences`;

    try {
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Remove markdown code fences if present
      responseText = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/```\s*$/i, "");

      // Parse JSON response
      let parsed = null;
      try {
        parsed = tryParseJson(responseText);
      } catch {
        parsed = null;
      }

      if (!parsed) {
        const fixedText = await fixJson(responseText);
        try {
          parsed = tryParseJson(fixedText);
        } catch {
          parsed = null;
        }
      }

      if (parsed) {
        let workingParsed: any = parsed;

        let normalizedCues = Array.isArray(workingParsed.cornellCues)
          ? workingParsed.cornellCues
              .map((cue: unknown) => String(cue || "").trim())
              .filter((cue: string) => cue.length > 0)
          : [];
        let normalizedNotes = Array.isArray(workingParsed.cornellNotes)
          ? workingParsed.cornellNotes
              .map((note: unknown) => String(note || "").trim())
              .filter((note: string) => note.length > 0)
          : [];
        let pairCount = Math.min(normalizedCues.length, normalizedNotes.length);

        // More aggressive quality check
        const avgNoteWords =
          normalizedNotes.length > 0
            ? normalizedNotes.reduce(
                (sum: number, note: string) => sum + wordCountFn(note),
                0,
              ) / normalizedNotes.length
            : 0;
        const needsRepair =
          pairCount < 5 ||
          avgNoteWords < 50 ||
          normalizedNotes.some((note: string) => noteLacksDepth(note));
        if (needsRepair) {
          const repaired = await maybeRepairQuality(
            workingParsed,
            enrichedTranscript,
          );
          if (repaired) {
            workingParsed = repaired;
            normalizedCues = Array.isArray(workingParsed.cornellCues)
              ? workingParsed.cornellCues
                  .map((cue: unknown) => String(cue || "").trim())
                  .filter((cue: string) => cue.length > 0)
              : [];
            normalizedNotes = Array.isArray(workingParsed.cornellNotes)
              ? workingParsed.cornellNotes
                  .map((note: unknown) => String(note || "").trim())
                  .filter((note: string) => note.length > 0)
              : [];
            pairCount = Math.min(normalizedCues.length, normalizedNotes.length);
          }
        }

        const diagramNodes = Array.isArray(workingParsed.diagramNodes)
          ? workingParsed.diagramNodes
              .map((label: unknown) => String(label || "").trim())
              .filter((label: string) => label.length > 0)
          : [];
        const diagramEdges = Array.isArray(workingParsed.diagramEdges)
          ? workingParsed.diagramEdges
              .map((edge: unknown) => String(edge || "").trim())
              .filter((edge: string) => edge.length > 0)
          : [];
        const normalizedActionItems = Array.isArray(workingParsed.actionItems)
          ? workingParsed.actionItems
              .map((item: unknown) => String(item || "").trim())
              .filter((item: string) => item.length > 0)
          : [];
        const normalizedReviewQuestions = Array.isArray(
          workingParsed.reviewQuestions,
        )
          ? workingParsed.reviewQuestions
              .map((question: unknown) => String(question || "").trim())
              .filter((question: string) => question.length > 0)
          : [];

        // Convert simplified diagram format to ReactFlow format
        let diagramData = undefined;
        if (diagramNodes.length > 0) {
          const nodes = diagramNodes.map((label: string, index: number) => {
            // Assign node types and colors based on position
            let type = "default";
            let color = "bg-gradient-to-br from-gray-500 to-gray-600";

            if (index === 0) {
              type = "concept";
              color = "bg-gradient-to-br from-purple-500 to-pink-500";
            } else if (index <= 3) {
              type = "topic";
              color = "bg-gradient-to-br from-blue-500 to-cyan-500";
            } else if (index <= 6) {
              type = "subtopic";
              color = "bg-gradient-to-br from-emerald-500 to-teal-500";
            } else {
              type = "note";
              color = "bg-gradient-to-br from-amber-400 to-orange-400";
            }

            return {
              id: String(index),
              type,
              data: { label, color },
              position: {
                x: index === 0 ? 400 : 200 + (index % 3) * 200,
                y: index === 0 ? 50 : Math.floor(index / 3) * 150 + 200,
              },
            };
          });

          const edges = diagramEdges.map((edge: string, index: number) => {
            const [source, target] = edge.split("-");
            return { id: `e${index}`, source, target, animated: true };
          });

          diagramData = { nodes, edges };
        }

        return {
          summary: workingParsed.summary || "",
          cornellCues: normalizedCues.slice(0, pairCount),
          cornellNotes: normalizedNotes.slice(0, pairCount),
          actionItems: normalizedActionItems,
          reviewQuestions: normalizedReviewQuestions,
          diagramData,
        };
      }

      // Fallback: return empty structure
      return {
        summary: "Could not generate structured notes.",
        cornellCues: [],
        cornellNotes: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      };
    } catch (error) {
      console.error("generateFromPinnedAudio error:", error);
      return {
        summary: "Error generating structured notes.",
        cornellCues: [],
        cornellNotes: [],
        actionItems: [],
        reviewQuestions: [],
        diagramData: undefined,
      };
    }
  },
});

/**
 * Move a note to a Smart Folder (course or module)
 * Converts a quick note to a page and assigns it to the folder
 */
export const moveNoteToFolder = mutation({
  args: {
    noteId: v.id("notes"),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { role } = await requireNoteAccess(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");

    // Move note to folder/module and convert to "page" type
    await ctx.db.patch(args.noteId, {
      noteType: "page",
      courseId: args.courseId,
      moduleId: args.moduleId,
    });

    return args.noteId;
  },
});

/**
 * Unassign a note from its folder (convert page back to quick note)
 */
export const unassignNoteFromFolder = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const { role } = await requireNoteAccess(ctx, args.noteId);
    if (role !== "owner") throw new Error("Forbidden");

    // Convert back to quick note by removing folder associations
    await ctx.db.patch(args.noteId, {
      noteType: "quick",
      courseId: undefined,
      moduleId: undefined,
    });

    return args.noteId;
  },
});

/**
 * Get multiple notes by IDs for bulk export
 */
export const getNotesByIds = query({
  args: {
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const notes = [];
    for (const noteId of args.noteIds) {
      const role = await getNoteRole(ctx, noteId, identity.tokenIdentifier);
      if (role) {
        const note = await ctx.db.get(noteId);
        if (!note) continue;
        notes.push(note);
      }
    }

    return notes;
  },
});

/**
 * Get all notes for a course (for bulk export)
 */
export const getNotesByCourse = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    const accessible = [];
    for (const n of notes) {
      if (n.isArchived) continue;
      const role = await getNoteRole(ctx, n._id, identity.tokenIdentifier);
      if (role) accessible.push(n);
    }
    return accessible;
  },
});

/**
 * Get all notes for the user (for bulk export)
 */
export const getAllNotesForExport = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let notesQuery = ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier));

    if (!args.includeArchived) {
      notesQuery = notesQuery.filter((q) => q.neq(q.field("isArchived"), true));
    }

    const notes = await notesQuery.order("desc").collect();

    return notes.map((note) => ({
      _id: note._id,
      title: note.title,
      content: note.content,
      courseId: note.courseId,
      moduleId: note.moduleId,
      noteType: note.noteType,
      style: note.style,
      createdAt: note.createdAt,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
    }));
  },
});

export const searchNotes = query({
  args: {
    query: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("tags"))),
    noteType: v.optional(v.string()),
    courseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let notes;

    if (args.query) {
      notes = await ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query!).eq("userId", identity.tokenIdentifier),
        )
        .collect();
    } else {
      notes = await ctx.db
        .query("notes")
        .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
        .order("desc") // Most recent first for non-search views
        .collect();
    }

    // In-memory filtering
    return notes.filter((n) => {
      // Exclude archived
      if (n.isArchived) return false;

      // Filter by noteType
      if (args.noteType && n.noteType !== args.noteType) return false;

      // Filter by courseId
      if (args.courseId && n.courseId !== args.courseId) return false;

      // Filter by Tags (Intersection: Note must have ALL selected tags)
      if (args.tagIds && args.tagIds.length > 0) {
        if (!n.tagIds || n.tagIds.length === 0) return false;
        const noteTagIds = new Set(n.tagIds);
        const hasAllTags = args.tagIds.every((tId) => noteTagIds.has(tId));
        if (!hasAllTags) return false;
      }

      return true;
    });
  },
});

// --- Bulk Operations ---

const BULK_UNDO_WINDOW_MS = 30 * 1000;

export const bulkMove = mutation({
  args: {
    noteIds: v.array(v.id("notes")),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const previous: Array<{
      noteId: any;
      courseId?: string;
      moduleId?: string;
    }> = [];

    for (const noteId of args.noteIds) {
      const { note } = await requireNoteOwner(ctx, noteId);
      previous.push({
        noteId,
        courseId: note.courseId,
        moduleId: note.moduleId,
      });
      await ctx.db.patch(noteId, {
        courseId: args.courseId,
        moduleId: args.moduleId,
        noteType: "page",
      });
    }

    const opId = await ctx.db.insert("bulkOperations", {
      userId: identity.tokenIdentifier,
      type: "move",
      noteIds: args.noteIds,
      payload: { previous },
      createdAt: Date.now(),
      expiresAt: Date.now() + BULK_UNDO_WINDOW_MS,
    });

    return { operationId: opId };
  },
});

export const bulkArchive = mutation({
  args: {
    noteIds: v.array(v.id("notes")),
    archived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const previous: Array<{ noteId: any; isArchived?: boolean }> = [];

    for (const noteId of args.noteIds) {
      const { note } = await requireNoteOwner(ctx, noteId);
      previous.push({ noteId, isArchived: note.isArchived });
      await ctx.db.patch(noteId, { isArchived: args.archived });
    }

    const opId = await ctx.db.insert("bulkOperations", {
      userId: identity.tokenIdentifier,
      type: "archive",
      noteIds: args.noteIds,
      payload: { previous },
      createdAt: Date.now(),
      expiresAt: Date.now() + BULK_UNDO_WINDOW_MS,
    });

    return { operationId: opId };
  },
});

export const bulkTag = mutation({
  args: {
    noteIds: v.array(v.id("notes")),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const previous: Array<{ noteId: any; tagIds: any[] }> = [];

    for (const noteId of args.noteIds) {
      const { note } = await requireNoteOwner(ctx, noteId);
      const existing = note.tagIds ?? [];
      previous.push({ noteId, tagIds: existing });
      const merged = Array.from(new Set([...existing, ...args.tagIds]));
      await ctx.db.patch(noteId, { tagIds: merged });
    }

    const opId = await ctx.db.insert("bulkOperations", {
      userId: identity.tokenIdentifier,
      type: "tag",
      noteIds: args.noteIds,
      payload: { previous },
      createdAt: Date.now(),
      expiresAt: Date.now() + BULK_UNDO_WINDOW_MS,
    });

    return { operationId: opId };
  },
});

export const bulkDelete = mutation({
  args: {
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const previous: Array<any> = [];

    for (const noteId of args.noteIds) {
      const { note } = await requireNoteOwner(ctx, noteId);
      previous.push(note);
      await ctx.db.delete(noteId);
    }

    const opId = await ctx.db.insert("bulkOperations", {
      userId: identity.tokenIdentifier,
      type: "delete",
      noteIds: args.noteIds,
      payload: { previous },
      createdAt: Date.now(),
      expiresAt: Date.now() + BULK_UNDO_WINDOW_MS,
    });

    return { operationId: opId };
  },
});

export const bulkUndo = mutation({
  args: { operationId: v.id("bulkOperations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const op = await ctx.db.get(args.operationId);
    if (!op || op.userId !== identity.tokenIdentifier) {
      throw new Error("Operation not found");
    }

    if (op.expiresAt < Date.now()) {
      throw new Error("Undo window expired");
    }

    if (op.type === "move") {
      for (const entry of op.payload.previous || []) {
        await ctx.db.patch(entry.noteId, {
          courseId: entry.courseId,
          moduleId: entry.moduleId,
        });
      }
    }

    if (op.type === "archive") {
      for (const entry of op.payload.previous || []) {
        await ctx.db.patch(entry.noteId, { isArchived: entry.isArchived });
      }
    }

    if (op.type === "tag") {
      for (const entry of op.payload.previous || []) {
        await ctx.db.patch(entry.noteId, { tagIds: entry.tagIds });
      }
    }

    if (op.type === "delete") {
      for (const note of op.payload.previous || []) {
        await ctx.db.insert("notes", {
          userId: note.userId,
          title: note.title,
          content: note.content,
          noteType: note.noteType,
          major: note.major,
          courseId: note.courseId,
          moduleId: note.moduleId,
          parentNoteId: note.parentNoteId,
          style: note.style,
          isPinned: note.isPinned,
          isArchived: note.isArchived,
          isShared: note.isShared,
          createdAt: note.createdAt,
          embedding: note.embedding,
          linkedDocumentIds: note.linkedDocumentIds,
          tagIds: note.tagIds,
          wordCount: note.wordCount,
          cornellCues: note.cornellCues,
          cornellNotes: note.cornellNotes,
          cornellSummary: note.cornellSummary,
          outlineData: note.outlineData,
          outlineMetadata: note.outlineMetadata,
          quickCaptureType: note.quickCaptureType,
          quickCaptureAudioUrl: note.quickCaptureAudioUrl,
          quickCaptureStatus: note.quickCaptureStatus,
          quickCaptureExpandedNoteId: note.quickCaptureExpandedNoteId,
        });
      }
    }

    await ctx.db.delete(args.operationId);
    return { ok: true };
  },
});
