import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const uploadFile = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    courseId: v.optional(v.string()),
    url: v.optional(v.string()),
    storageId: v.optional(v.string()), // ID from Convex Storage
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Set processingStatus to "pending" for PDFs so they can be auto-processed
    const isPdf =
      args.type === "pdf" || args.name.toLowerCase().endsWith(".pdf");

    const fileId = await ctx.db.insert("files", {
      userId: identity.tokenIdentifier,
      name: args.name,
      type: args.type,
      url: args.url,
      storageId: args.storageId,
      courseId: args.courseId,
      createdAt: Date.now(),
      processingStatus: isPdf ? "pending" : undefined,
    });

    return fileId;
  },
});

export const getFiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .take(10);

    // Enrich files with storage URLs if applicable
    return Promise.all(
      files.map(async (file) => {
        if (file.storageId) {
          return {
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          };
        }
        return file;
      })
    );
  },
});

export const getFilesByContext = query({
  args: {
    courseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !args.courseId) return [];

    // Since we don't have a direct by_courseId index on files in the schema I see,
    // (Wait, I did see specific indexes in schema.ts: .index("by_courseId", ["courseId"]))
    // No, wait. files index: .index("by_userId", ["userId"]).
    // Files table DOES NOT have courseId index in lines 56-64 of schema.ts!
    // It has a column but no index.
    // I should probably add an index, but I cannot run `npx convex dev` easily here to migrate schema.
    // I will use filter for now. It won't be performant for huge datasets but fine for MVP.

    // Actually, I can filter by userId then filter by courseId.
    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .collect();

    return Promise.all(
      files.map(async (file) => {
        if (file.storageId) {
          return {
            ...file,
            url: await ctx.storage.getUrl(file.storageId),
          };
        }
        return file;
      })
    );
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.fileId);
  },
});

export const renameFile = mutation({
  args: { fileId: v.id("files"), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.fileId, { name: args.name });
  },
});

/**
 * Get a single file by ID (for document processing)
 */
export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;

    // Get storage URL if applicable
    if (file.storageId) {
      return {
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      };
    }
    return file;
  },
});

/**
 * Get files pending processing
 */
export const getPendingFiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("files")
      .withIndex("by_processingStatus", (q) =>
        q.eq("processingStatus", "pending")
      )
      .filter((q) => q.eq(q.field("userId"), identity.tokenIdentifier))
      .take(10);
  },
});

/**
 * Update file processing status
 */
export const updateProcessingStatus = mutation({
  args: {
    fileId: v.id("files"),
    status: v.string(), // "pending" | "processing" | "done" | "error"
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      processingStatus: args.status,
    });
  },
});

/**
 * Save extracted content from document processing
 */
export const saveExtractedContent = mutation({
  args: {
    fileId: v.id("files"),
    extractedText: v.string(),
    summary: v.string(),
    keyTopics: v.array(v.string()),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      extractedText: args.extractedText,
      summary: args.summary,
      keyTopics: args.keyTopics,
      embedding: args.embedding,
      processingStatus: "done",
      processedAt: Date.now(),
    });
  },
});
