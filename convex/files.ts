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

    const fileId = await ctx.db.insert("files", {
      userId: identity.tokenIdentifier,
      name: args.name,
      type: args.type,
      url: args.url,
      storageId: args.storageId,
      courseId: args.courseId,
      createdAt: Date.now(),
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
