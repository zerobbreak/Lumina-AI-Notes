import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const chatRole = v.union(v.literal("user"), v.literal("assistant"));
const chatMode = v.union(
  v.literal("explain"),
  v.literal("synthesize"),
  v.literal("compare"),
  v.literal("apply"),
  v.literal("quiz"),
  v.literal("fill_gaps"),
);

async function requireIdentity(
  ctx: { auth: MutationCtx["auth"] | QueryCtx["auth"] },
): Promise<NonNullable<Awaited<ReturnType<MutationCtx["auth"]["getUserIdentity"]>>>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

async function requireSessionOwner(
  ctx: { db: QueryCtx["db"] | MutationCtx["db"] },
  sessionId: Id<"chatSessions">,
  tokenIdentifier: string,
): Promise<Doc<"chatSessions">> {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== tokenIdentifier) {
    throw new Error("Chat session not found");
  }
  return session;
}

export const getSessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("chatSessions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

export const getSession = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    try {
      return await requireSessionOwner(
        ctx,
        args.sessionId,
        identity.tokenIdentifier,
      );
    } catch {
      return null;
    }
  },
});

export const getRecentMessages = query({
  args: {
    sessionId: v.id("chatSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    try {
      await requireSessionOwner(ctx, args.sessionId, identity.tokenIdentifier);
    } catch {
      return [];
    }

    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_sessionId_createdAt", (q) =>
        q.eq("sessionId", args.sessionId),
      )
      .order("desc")
      .take(limit);

    return messages
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  },
});

export const getContextNotes = query({
  args: { noteIds: v.array(v.id("notes")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const uniqueIds = Array.from(new Set(args.noteIds));
    const docs = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
    return docs
      .filter((d): d is Doc<"notes"> => d !== null)
      .filter((d) => d.userId === identity.tokenIdentifier)
      .map((d) => ({
        id: d._id,
        title: d.title,
        content: d.content ?? "",
      }));
  },
});

export const getMessages = query({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    try {
      await requireSessionOwner(ctx, args.sessionId, identity.tokenIdentifier);
    } catch {
      // Session missing/deleted is an expected case in the UI (self-healing).
      return [];
    }
    const limit = 300;
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_sessionId_createdAt", (q) =>
        q.eq("sessionId", args.sessionId),
      )
      .order("asc")
      .take(limit);

    const noteIds = new Set<Id<"notes">>();
    for (const msg of messages) {
      for (const id of msg.contextNoteIds ?? []) noteIds.add(id);
    }

    const noteDocs = await Promise.all(
      Array.from(noteIds).map((id) => ctx.db.get(id)),
    );

    const notesById = new Map<
      Id<"notes">,
      { id: Id<"notes">; title: string }
    >();
    for (const n of noteDocs) {
      if (!n) continue;
      if (n.userId !== identity.tokenIdentifier) continue;
      notesById.set(n._id, { id: n._id, title: n.title });
    }

    return await Promise.all(
      messages.map(async (msg) => ({
        ...msg,
        notes: (msg.contextNoteIds ?? [])
          .map((id) => notesById.get(id))
          .filter(
            (n): n is { id: Id<"notes">; title: string } => n !== undefined,
          ),
      })),
    );
  },
});

export const createSession = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    return await ctx.db.insert("chatSessions", {
      userId: identity.tokenIdentifier,
      title: args.title.trim().slice(0, 80) || "New Chat",
      pinnedNoteIds: [],
      mode: "explain",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setSessionMode = mutation({
  args: { sessionId: v.id("chatSessions"), mode: chatMode },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireSessionOwner(ctx, args.sessionId, identity.tokenIdentifier);
    await ctx.db.patch(args.sessionId, { mode: args.mode, updatedAt: Date.now() });
  },
});

export const updateSessionTitle = mutation({
  args: { sessionId: v.id("chatSessions"), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireSessionOwner(ctx, args.sessionId, identity.tokenIdentifier);
    const title = args.title.trim().slice(0, 80) || "New Chat";
    await ctx.db.patch(args.sessionId, { title, updatedAt: Date.now() });
  },
});

export const pinNotesToSession = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const session = await requireSessionOwner(
      ctx,
      args.sessionId,
      identity.tokenIdentifier,
    );

    const existing = Array.isArray(session.pinnedNoteIds)
      ? session.pinnedNoteIds
      : [];
    const nextSet = new Set(existing);

    // Only pin notes owned by this user.
    const uniqueIds = Array.from(new Set(args.noteIds));
    const docs = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
    for (const d of docs) {
      if (!d) continue;
      if (d.userId !== identity.tokenIdentifier) continue;
      nextSet.add(d._id);
    }

    await ctx.db.patch(args.sessionId, {
      pinnedNoteIds: Array.from(nextSet),
      updatedAt: Date.now(),
    });
  },
});

export const unpinNoteFromSession = mutation({
  args: { sessionId: v.id("chatSessions"), noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const session = await requireSessionOwner(
      ctx,
      args.sessionId,
      identity.tokenIdentifier,
    );
    const existing = Array.isArray(session.pinnedNoteIds)
      ? session.pinnedNoteIds
      : [];
    await ctx.db.patch(args.sessionId, {
      pinnedNoteIds: existing.filter((id) => id !== args.noteId),
      updatedAt: Date.now(),
    });
  },
});

export const sendMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    role: chatRole,
    content: v.string(),
    contextNoteIds: v.optional(v.array(v.id("notes"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireSessionOwner(ctx, args.sessionId, identity.tokenIdentifier);
    const now = Date.now();
    await ctx.db.patch(args.sessionId, { updatedAt: now });
    return await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content.trim(),
      contextNoteIds: args.contextNoteIds,
      createdAt: now,
    });
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireSessionOwner(ctx, args.sessionId, identity.tokenIdentifier);

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.sessionId);
  },
});
