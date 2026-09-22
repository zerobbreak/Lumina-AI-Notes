import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { noteCollaborators, noteInvites, notes } from "../db/schema/index.js";
import type { User } from "../middleware/user.js";
import { normalizeEmail } from "./helpers.js";

/** Port of Convex acceptPendingInvites — run after sign-in or on app start. */
export async function acceptPendingInvites(db: Db, user: User) {
  const email = normalizeEmail(user.email);
  if (!email) return { accepted: 0 };

  const invites = await db.select().from(noteInvites).where(eq(noteInvites.email, email));

  let accepted = 0;
  for (const invite of invites) {
    if (invite.acceptedAt) continue;

    const [note] = await db.select().from(notes).where(eq(notes.id, invite.noteId)).limit(1);
    if (!note) continue;

    if (note.userId === user.id) {
      await db
        .update(noteInvites)
        .set({ acceptedAt: new Date(), acceptedBy: user.id })
        .where(eq(noteInvites.id, invite.id));
      continue;
    }

    const [existing] = await db
      .select()
      .from(noteCollaborators)
      .where(and(eq(noteCollaborators.noteId, invite.noteId), eq(noteCollaborators.userId, user.id)))
      .limit(1);

    if (!existing) {
      await db.insert(noteCollaborators).values({
        noteId: invite.noteId,
        userId: user.id,
        role: invite.role,
        addedBy: invite.invitedBy,
      });
    }

    await db
      .update(noteInvites)
      .set({ acceptedAt: new Date(), acceptedBy: user.id })
      .where(and(eq(noteInvites.id, invite.id), isNull(noteInvites.acceptedAt)));
    accepted += 1;
  }

  return { accepted };
}
