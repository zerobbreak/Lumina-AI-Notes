import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function requireIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

async function requireOwner(ctx: any, noteId: any) {
  const identity = await requireIdentity(ctx);
  const note = await ctx.db.get(noteId);
  if (!note) throw new Error("Note not found");
  if (note.userId !== identity.tokenIdentifier) throw new Error("Unauthorized");
  return { identity, note };
}

export const inviteToNote = mutation({
  args: {
    noteId: v.id("notes"),
    email: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    const { identity, note } = await requireOwner(ctx, args.noteId);

    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Invalid email");

    // If the user already exists, add/update collaborator immediately.
    const invitedUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .unique();

    if (invitedUser) {
      // Owner is implicit; don't allow adding the owner as a collaborator.
      if (note.userId === invitedUser.tokenIdentifier) {
        return { status: "owner", added: false };
      }

      const existing = await ctx.db
        .query("noteCollaborators")
        .withIndex("by_noteId_userId", (q: any) =>
          q.eq("noteId", args.noteId).eq("userId", invitedUser.tokenIdentifier)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { role: args.role });
        return { status: "updated", added: false };
      }

      await ctx.db.insert("noteCollaborators", {
        noteId: args.noteId,
        userId: invitedUser.tokenIdentifier,
        role: args.role,
        addedAt: Date.now(),
        addedBy: identity.tokenIdentifier,
      });

      return { status: "added", added: true };
    }

    // Otherwise, store an email invite to be accepted later.
    const existingInvite = await ctx.db
      .query("noteInvites")
      .withIndex("by_noteId_email", (q: any) =>
        q.eq("noteId", args.noteId).eq("email", email)
      )
      .unique();

    if (existingInvite) {
      // Refresh role and mark as pending again (if it was accepted previously).
      await ctx.db.patch(existingInvite._id, {
        role: args.role,
        invitedBy: identity.tokenIdentifier,
        createdAt: Date.now(),
        acceptedAt: undefined,
        acceptedBy: undefined,
      });
      return { status: "invited", invited: true };
    }

    await ctx.db.insert("noteInvites", {
      noteId: args.noteId,
      email,
      role: args.role,
      invitedBy: identity.tokenIdentifier,
      createdAt: Date.now(),
    });

    return { status: "invited", invited: true };
  },
});

export const acceptPendingInvites = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const email = normalizeEmail(identity.email || "");
    if (!email) return { accepted: 0 };

    const invites = await ctx.db
      .query("noteInvites")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .collect();

    let accepted = 0;
    for (const invite of invites) {
      // Skip already accepted
      if (invite.acceptedAt) continue;

      const note = await ctx.db.get(invite.noteId);
      if (!note) continue;

      // Owner doesn't need an invite
      if (note.userId === identity.tokenIdentifier) {
        await ctx.db.patch(invite._id, {
          acceptedAt: Date.now(),
          acceptedBy: identity.tokenIdentifier,
        });
        continue;
      }

      const existing = await ctx.db
        .query("noteCollaborators")
        .withIndex("by_noteId_userId", (q: any) =>
          q.eq("noteId", invite.noteId).eq("userId", identity.tokenIdentifier)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("noteCollaborators", {
          noteId: invite.noteId,
          userId: identity.tokenIdentifier,
          role: invite.role,
          addedAt: Date.now(),
          addedBy: invite.invitedBy,
        });
      }

      await ctx.db.patch(invite._id, {
        acceptedAt: Date.now(),
        acceptedBy: identity.tokenIdentifier,
      });
      accepted += 1;
    }

    return { accepted };
  },
});

export const removeCollaborator = mutation({
  args: {
    noteId: v.id("notes"),
    collaboratorUserId: v.string(), // tokenIdentifier
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.noteId);

    const existing = await ctx.db
      .query("noteCollaborators")
      .withIndex("by_noteId_userId", (q: any) =>
        q.eq("noteId", args.noteId).eq("userId", args.collaboratorUserId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { removed: !!existing };
  },
});

export const updateCollaboratorRole = mutation({
  args: {
    noteId: v.id("notes"),
    collaboratorUserId: v.string(), // tokenIdentifier
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.noteId);

    const existing = await ctx.db
      .query("noteCollaborators")
      .withIndex("by_noteId_userId", (q: any) =>
        q.eq("noteId", args.noteId).eq("userId", args.collaboratorUserId)
      )
      .unique();

    if (!existing) throw new Error("Collaborator not found");
    await ctx.db.patch(existing._id, { role: args.role });
    return { updated: true };
  },
});

export const revokeInvite = mutation({
  args: {
    noteId: v.id("notes"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.noteId);
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("noteInvites")
      .withIndex("by_noteId_email", (q: any) =>
        q.eq("noteId", args.noteId).eq("email", email)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { revoked: !!existing };
  },
});

export const getNoteAccess = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const note = await ctx.db.get(args.noteId);
    if (!note) return null;
    if (note.userId === identity.tokenIdentifier) {
      return { role: "owner" as const };
    }
    const collab = await ctx.db
      .query("noteCollaborators")
      .withIndex("by_noteId_userId", (q: any) =>
        q.eq("noteId", args.noteId).eq("userId", identity.tokenIdentifier)
      )
      .unique();
    if (!collab) return null;
    return { role: collab.role };
  },
});

export const listPeopleWithAccess = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const note = await ctx.db.get(args.noteId);
    if (!note) return null;

    const isOwner = note.userId === identity.tokenIdentifier;
    const collab = !isOwner
      ? await ctx.db
          .query("noteCollaborators")
          .withIndex("by_noteId_userId", (q: any) =>
            q.eq("noteId", args.noteId).eq("userId", identity.tokenIdentifier)
          )
          .unique()
      : null;

    if (!isOwner && !collab) return null;

    const ownerUser = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q: any) =>
        q.eq("tokenIdentifier", note.userId)
      )
      .unique();

    const collaborators = await ctx.db
      .query("noteCollaborators")
      .withIndex("by_noteId", (q: any) => q.eq("noteId", args.noteId))
      .collect();

    const collaboratorUsers = await Promise.all(
      collaborators.map(async (c: any) => {
        const u = await ctx.db
          .query("users")
          .withIndex("by_tokenIdentifier", (q: any) =>
            q.eq("tokenIdentifier", c.userId)
          )
          .unique();
        return {
          userId: c.userId,
          role: c.role,
          name: u?.name ?? u?.email ?? "Unknown",
          email: u?.email,
          image: u?.image,
        };
      })
    );

    // Only owners can see invites
    const invites = isOwner
      ? await ctx.db
          .query("noteInvites")
          .withIndex("by_noteId", (q: any) => q.eq("noteId", args.noteId))
          .filter((q: any) => q.eq(q.field("acceptedAt"), undefined))
          .collect()
      : [];

    return {
      viewerRole: isOwner ? ("owner" as const) : (collab!.role as "viewer" | "editor"),
      owner: {
        userId: note.userId,
        role: "owner" as const,
        name: ownerUser?.name ?? ownerUser?.email ?? "Owner",
        email: ownerUser?.email,
        image: ownerUser?.image,
      },
      collaborators: collaboratorUsers,
      invites: invites.map((i: any) => ({
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
      })),
    };
  },
});

