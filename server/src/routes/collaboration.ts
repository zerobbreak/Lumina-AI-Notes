import { and, eq, isNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { normalizeEmail, toPerson } from "../collaboration/helpers.js";
import type { Db } from "../db/client.js";
import { noteCollaborators, noteInvites, notes, users } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { requireNote } from "../notes/access.js";
import { parse } from "./validation.js";

const role = z.enum(["viewer", "editor"]);

const inviteBody = z.object({
  email: z.string().trim().min(3).max(320),
  role,
});

const revokeInviteBody = z.object({
  email: z.string().trim().min(3).max(320),
});

const updateRoleBody = z.object({ role });

/** Port of convex/collaboration.ts — invite lifecycle and access listing. */
export function createCollaborationRouter(db: Db) {
  const router = Router({ mergeParams: true });

  /** getNoteAccess */
  router.get("/:id/access", async (req, res) => {
    const user = currentUser(res);
    const { role: noteRole } = await requireNote(db, req.params.id, user.id, "view");
    res.json({ role: noteRole });
  });

  /** listPeopleWithAccess */
  router.get("/:id/collaborators", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;
    const { role: viewerRole } = await requireNote(db, noteId, user.id, "view");

    const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (!note) throw new HttpError(404, "Note not found", "not_found");

    const [owner] = await db.select().from(users).where(eq(users.id, note.userId)).limit(1);
    if (!owner) throw new HttpError(404, "Note not found", "not_found");

    const collaborators = await db
      .select({ collab: noteCollaborators, user: users })
      .from(noteCollaborators)
      .innerJoin(users, eq(users.id, noteCollaborators.userId))
      .where(eq(noteCollaborators.noteId, noteId));

    const invites =
      viewerRole === "owner"
        ? await db
            .select()
            .from(noteInvites)
            .where(and(eq(noteInvites.noteId, noteId), isNull(noteInvites.acceptedAt)))
        : [];

    res.json({
      viewerRole,
      owner: toPerson(owner, "owner"),
      collaborators: collaborators.map(({ collab, user: u }) => toPerson(u, collab.role)),
      invites: invites.map((i) => ({ email: i.email, role: i.role, createdAt: i.createdAt.getTime() })),
    });
  });

  /** inviteToNote */
  router.post("/:id/collaborators/invite", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;
    const { email: rawEmail, role: inviteRole } = parse(inviteBody, req.body);
    const { note } = await requireNote(db, noteId, user.id, "own");

    const email = normalizeEmail(rawEmail);
    if (!email.includes("@")) throw new HttpError(400, "Invalid email", "invalid_request");

    const [invitedUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (invitedUser) {
      if (note.userId === invitedUser.id) {
        res.json({ status: "owner", added: false });
        return;
      }

      const [existing] = await db
        .select()
        .from(noteCollaborators)
        .where(and(eq(noteCollaborators.noteId, noteId), eq(noteCollaborators.userId, invitedUser.id)))
        .limit(1);

      if (existing) {
        await db.update(noteCollaborators).set({ role: inviteRole }).where(eq(noteCollaborators.id, existing.id));
        res.json({ status: "updated", added: false });
        return;
      }

      await db.insert(noteCollaborators).values({
        noteId,
        userId: invitedUser.id,
        role: inviteRole,
        addedBy: user.id,
      });
      res.json({ status: "added", added: true });
      return;
    }

    const [existingInvite] = await db
      .select()
      .from(noteInvites)
      .where(and(eq(noteInvites.noteId, noteId), eq(noteInvites.email, email)))
      .limit(1);

    if (existingInvite) {
      await db
        .update(noteInvites)
        .set({
          role: inviteRole,
          invitedBy: user.id,
          createdAt: new Date(),
          acceptedAt: null,
          acceptedBy: null,
        })
        .where(eq(noteInvites.id, existingInvite.id));
      res.json({ status: "invited", invited: true });
      return;
    }

    await db.insert(noteInvites).values({
      noteId,
      email,
      role: inviteRole,
      invitedBy: user.id,
    });
    res.json({ status: "invited", invited: true });
  });

  /** removeCollaborator */
  router.delete("/:id/collaborators/:userId", async (req, res) => {
    const user = currentUser(res);
    await requireNote(db, req.params.id, user.id, "own");

    const deleted = await db
      .delete(noteCollaborators)
      .where(
        and(eq(noteCollaborators.noteId, req.params.id), eq(noteCollaborators.userId, req.params.userId)),
      )
      .returning({ id: noteCollaborators.id });

    res.json({ removed: deleted.length > 0 });
  });

  /** updateCollaboratorRole */
  router.patch("/:id/collaborators/:userId", async (req, res) => {
    const user = currentUser(res);
    const { role: newRole } = parse(updateRoleBody, req.body);
    await requireNote(db, req.params.id, user.id, "own");

    const updated = await db
      .update(noteCollaborators)
      .set({ role: newRole })
      .where(
        and(eq(noteCollaborators.noteId, req.params.id), eq(noteCollaborators.userId, req.params.userId)),
      )
      .returning({ id: noteCollaborators.id });

    if (updated.length === 0) throw new HttpError(404, "Collaborator not found", "not_found");
    res.json({ updated: true });
  });

  /** revokeInvite */
  router.delete("/:id/invites", async (req, res) => {
    const user = currentUser(res);
    const noteId = req.params.id;
    const { email: rawEmail } = parse(revokeInviteBody, req.body);
    await requireNote(db, noteId, user.id, "own");

    const email = normalizeEmail(rawEmail);
    const deleted = await db
      .delete(noteInvites)
      .where(and(eq(noteInvites.noteId, noteId), eq(noteInvites.email, email)))
      .returning({ id: noteInvites.id });

    res.json({ revoked: deleted.length > 0 });
  });

  return router;
}
