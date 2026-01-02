import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const createNote = mutation({
  args: {
    title: v.string(),
    major: v.optional(v.string()),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
    parentNoteId: v.optional(v.id("notes")),
    style: v.optional(v.string()),
    noteType: v.optional(v.string()), // "quick" | "page"
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
      content: "",
      isPinned: false,
      createdAt: Date.now(),
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

    const notes = await ctx.db
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
              q.eq(q.field("moduleId"), undefined)
            )
          )
        )
      )
      .order("desc")
      .take(10);

    return notes;
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

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc") // Most recent first
      .take(5);

    return notes;
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
      return await ctx.db
        .query("notes")
        .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId!))
        .filter((q) => q.eq(q.field("userId"), identity.tokenIdentifier))
        .collect();
    }

    if (args.courseId) {
      return await ctx.db
        .query("notes")
        .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId!))
        .filter((q) => q.eq(q.field("userId"), identity.tokenIdentifier))
        .collect();
    }

    return [];
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.noteId);
  },
});

export const toggleArchiveNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");
    // If it doesn't have isArchived field yet, treat as false -> true
    const currentArchived = note.isArchived ?? false;
    await ctx.db.patch(args.noteId, { isArchived: !currentArchived });
  },
});

export const renameNote = mutation({
  args: { noteId: v.id("notes"), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.noteId, { title: args.title });
  },
});

export const getNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const note = await ctx.db.get(args.noteId);
    if (note?.userId !== identity.tokenIdentifier) return null;
    return note;
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Validate ownership
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier)
      throw new Error("Unauthorized");

    const patch: any = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;

    await ctx.db.patch(args.noteId, patch);
  },
});

export const toggleShareNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    const existingIds = note.linkedDocumentIds || [];
    const newIds = existingIds.filter((id) => id !== args.documentId);

    await ctx.db.patch(args.noteId, { linkedDocumentIds: newIds });
    return newIds;
  },
});

/**
 * Helper query to fetch documents by their IDs (for use in actions)
 */
export const getDocumentsByIds = query({
  args: { documentIds: v.array(v.id("documents")) },
  handler: async (ctx, args) => {
    const docs = await Promise.all(
      args.documentIds.map((id) => ctx.db.get(id))
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

    // 1. Embed the transcript
    const embeddingResult = await embeddingModel.embedContent(args.transcript);
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

    // 4. Generate structured notes with context
    const contextSection = contextText
      ? `\n\nRelevant Context from Pinned Document:\n"""\n${contextText}\n"""\n\nUse this context to enhance your notes. Reference specific information from the document when relevant.`
      : "";

    const prompt = `You are an expert academic note-taker. Your goal is to convert the following lecture transcript into clear, structured, and visually distinct study notes.${contextSection}

Transcript:
"""
${args.transcript}
"""

Instructions:
1. **Analyze the Core Topic**: Identify the main subject of the lecture immediately.
2. **Structure**: Organize the output into the EXACT JSON format below.
3. **Clarity**: Ensure cues are distinct questions or keywords, and notes are detailed explanations.

Generate a JSON response with this EXACT structure:
{
  "summary": "Start with a bold statement identifying the MAIN TOPIC (e.g., 'This lecture covers...'). Then provide a 2-3 sentence overview of key takeaways.",
  "cornellCues": ["Major Concept 1", "Key Question 2", "Term Definition"],
  "cornellNotes": ["Detailed explanation of Concept 1...", "Answer to Question 2...", "Definition and context..."],
  "actionItems": ["Homework: ...", "Read: ...", "Due date: ..."],
  "reviewQuestions": ["What is...?", "How does...?", "Why is...?"],
  "diagramData": {
    "nodes": [
      { "id": "1", "type": "input", "data": { "label": "Main Topic" }, "position": { "x": 0, "y": 0 } },
      { "id": "2", "data": { "label": "Subconcept" }, "position": { "x": 100, "y": 100 } }
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2" }
    ]
  }
}

Rules:
- cornellCues and cornellNotes arrays must have the same length
- cornellCues should be short (1-5 words) and impactful
- actionItems should only include explicitly mentioned tasks/deadlines (empty array if none)
- diagramData should form a logical concept map of the lecture
- Use "type": "input" for the Central Topic node
- Generate reasonable (x, y) positions to minimize overlap (simulated layout)
- If context was provided, integrate relevant information from the document
- Return ONLY valid JSON, no markdown code fences or explanation`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || "",
          cornellCues: parsed.cornellCues || [],
          cornellNotes: parsed.cornellNotes || [],
          actionItems: parsed.actionItems || [],
          reviewQuestions: parsed.reviewQuestions || [],
          mermaidGraph: parsed.mermaidGraph || "",
        };
      }

      // Fallback: return empty structure
      return {
        summary: "Could not generate structured notes.",
        cornellCues: [],
        cornellNotes: [],
        actionItems: [],
        reviewQuestions: [],
        mermaidGraph: "",
      };
    } catch (error) {
      console.error("generateFromPinnedAudio error:", error);
      return {
        summary: "Error generating structured notes.",
        cornellCues: [],
        cornellNotes: [],
        actionItems: [],
        reviewQuestions: [],
        mermaidGraph: "",
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }

    // Convert back to quick note by removing folder associations
    await ctx.db.patch(args.noteId, {
      noteType: "quick",
      courseId: undefined,
      moduleId: undefined,
    });

    return args.noteId;
  },
});
