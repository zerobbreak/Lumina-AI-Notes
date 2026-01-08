import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Internal query to get note for export (checks ownership)
 * Used by the action to verify permissions
 */
export const internalGetNoteForExport = internalQuery({
  args: { noteId: v.id("notes"), tokenIdentifier: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{
    _id: Id<"notes">;
    title: string;
    isShared: boolean | undefined;
  } | null> => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== args.tokenIdentifier) {
      return null;
    }

    return {
      _id: note._id,
      title: note.title,
      isShared: note.isShared,
    };
  },
});

/**
 * Internal mutation to update note with export information
 */
export const internalUpdateExportInfo = internalMutation({
  args: {
    noteId: v.id("notes"),
    storageId: v.string(),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== args.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.patch(args.noteId, {
      lastExportedAt: Date.now(),
      exportStorageId: args.storageId,
    });
  },
});

/**
 * Generate a PDF export of a note using headless browser rendering
 * Orchestrates the full export flow: render → store → return URL
 */
export const generateAndStorePdf = action({
  args: {
    noteId: v.id("notes"),
    options: v.optional(
      v.object({
        format: v.optional(
          v.union(v.literal("A4"), v.literal("Letter"), v.literal("Legal"))
        ),
        printBackground: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    url: string | null;
    storageId: string;
    title: string;
    exportedAt: number;
  }> => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // 1. Get the note to verify it exists and get the title
    const note = await ctx.runQuery(internal.export.internalGetNoteForExport, {
      noteId: args.noteId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!note) {
      throw new Error(
        "Note not found or you don't have permission to export it"
      );
    }

    // 2. Build the print URL
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL environment variable is not set");
    }

    const printUrl = `${siteUrl}/print/${args.noteId}`;

    // 3. Generate a simple export token (in production, use signed tokens)
    const token = `export_${args.noteId}_${Date.now()}`;

    // 4. Call the Next.js API route to generate the PDF
    const response = await fetch(`${siteUrl}/api/render-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: printUrl,
        token,
        options: args.options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${errorText}`);
    }

    // 5. Get the PDF blob and store it in Convex File Storage
    const pdfBlob = await response.blob();
    const storageId = await ctx.storage.store(pdfBlob);

    // 6. Update the note with export info
    await ctx.runMutation(internal.export.internalUpdateExportInfo, {
      noteId: args.noteId,
      storageId,
      tokenIdentifier: identity.tokenIdentifier,
    });

    // 7. Get the URL for the stored PDF
    const pdfUrl = await ctx.storage.getUrl(storageId);

    return {
      url: pdfUrl,
      storageId,
      title: note.title,
      exportedAt: Date.now(),
    };
  },
});

/**
 * Public query to get note for export (checks ownership)
 */
export const getNoteForExport = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      return null;
    }

    return {
      _id: note._id,
      title: note.title,
      isShared: note.isShared,
    };
  },
});

/**
 * Public mutation to update note with export information
 */
export const updateExportInfo = mutation({
  args: {
    noteId: v.id("notes"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.patch(args.noteId, {
      lastExportedAt: Date.now(),
      exportStorageId: args.storageId,
    });
  },
});

/**
 * Get the last exported PDF URL for a note
 */
export const getLastExport = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      return null;
    }

    if (!note.exportStorageId) {
      return null;
    }

    const url = await ctx.storage.getUrl(
      note.exportStorageId as Id<"_storage">
    );
    return {
      url,
      exportedAt: note.lastExportedAt,
    };
  },
});
