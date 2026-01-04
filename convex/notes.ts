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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.delete(args.noteId);
  },
});

export const toggleArchiveNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }
    // If it doesn't have isArchived field yet, treat as false -> true
    const currentArchived = note.isArchived ?? false;
    await ctx.db.patch(args.noteId, { isArchived: !currentArchived });
  },
});

export const togglePinNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }
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
        q.eq("userId", identity.tokenIdentifier).eq("isPinned", true)
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }

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
    // Cornell Notes specific fields
    cornellCues: v.optional(v.string()),
    cornellNotes: v.optional(v.string()),
    cornellSummary: v.optional(v.string()),
    // Outline Mode specific fields
    outlineData: v.optional(v.string()),
    outlineMetadata: v.optional(v.object({
      totalItems: v.number(),
      completedTasks: v.number(),
      collapsedNodes: v.array(v.string()),
    })),
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
    if (args.cornellCues !== undefined) patch.cornellCues = args.cornellCues;
    if (args.cornellNotes !== undefined) patch.cornellNotes = args.cornellNotes;
    if (args.cornellSummary !== undefined) patch.cornellSummary = args.cornellSummary;
    if (args.outlineData !== undefined) patch.outlineData = args.outlineData;
    if (args.outlineMetadata !== undefined) patch.outlineMetadata = args.outlineMetadata;

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
  "summary": "Start with the MAIN TOPIC. Then provide a 2-3 sentence overview.",
  "cornellCues": ["Concept 1", "Concept 2", "Concept 3"],
  "cornellNotes": ["Explanation 1", "Explanation 2", "Explanation 3"],
  "actionItems": ["Task 1", "Task 2"],
  "reviewQuestions": ["Question 1?", "Question 2?"],
  "diagramNodes": ["Main Topic", "Subtopic A", "Subtopic B", "Subtopic C"],
  "diagramEdges": ["0-1", "0-2", "1-3"]
}

Rules:
- cornellCues and cornellNotes arrays must have the same length
- diagramNodes is an array of node labels (strings). First item is the central topic.
- diagramEdges is an array of connections in format "sourceIndex-targetIndex" (e.g., "0-1" means node 0 connects to node 1)
- actionItems should only include explicitly mentioned tasks (empty array if none)
- Return ONLY valid JSON, no markdown code fences`;

    try {
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Remove markdown code fences if present
      responseText = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/```\s*$/i, "");

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Convert simplified diagram format to ReactFlow format
        let diagramData = undefined;
        if (
          parsed.diagramNodes &&
          Array.isArray(parsed.diagramNodes) &&
          parsed.diagramNodes.length > 0
        ) {
          const nodes = parsed.diagramNodes.map(
            (label: string, index: number) => {
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
            }
          );

          const edges = (parsed.diagramEdges || []).map(
            (edge: string, index: number) => {
              const [source, target] = edge.split("-");
              return { id: `e${index}`, source, target, animated: true };
            }
          );

          diagramData = { nodes, edges };
        }

        return {
          summary: parsed.summary || "",
          cornellCues: parsed.cornellCues || [],
          cornellNotes: parsed.cornellNotes || [],
          actionItems: parsed.actionItems || [],
          reviewQuestions: parsed.reviewQuestions || [],
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
