import { and, eq, isNull, lte } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { files, notes, users } from "../../db/schema/index.js";
import type { Storage } from "../../storage/s3.js";

const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Port of convex/cleanup.cleanupStaleNotesAndFilesInternal */
export async function cleanupStaleNotesAndFiles(
  db: Db,
  storage: Storage,
  args: { maxAgeMs?: number; perUserLimit?: number } = {},
) {
  const maxAgeMs = args.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const perUserLimit = Math.max(1, Math.min(500, args.perUserLimit ?? 200));
  const cutoff = new Date(Date.now() - maxAgeMs);

  const allUsers = await db.select({ id: users.id }).from(users);
  let deletedNotes = 0;
  let deletedFiles = 0;

  for (const user of allUsers) {
    const staleNotes = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.userId, user.id), lte(notes.lastAccessedAt, cutoff)))
      .limit(perUserLimit);

    const legacyNotes = await db
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(eq(notes.userId, user.id), isNull(notes.lastAccessedAt), lte(notes.createdAt, cutoff)),
      )
      .limit(perUserLimit);

    const noteIds = [...new Set([...staleNotes, ...legacyNotes].map((n) => n.id))].slice(
      0,
      perUserLimit,
    );
    for (const noteId of noteIds) {
      await db.delete(notes).where(eq(notes.id, noteId));
      deletedNotes += 1;
    }

    const staleFiles = await db
      .select({ id: files.id, storageKey: files.storageKey })
      .from(files)
      .where(and(eq(files.userId, user.id), lte(files.lastAccessedAt, cutoff)))
      .limit(perUserLimit);

    const legacyFiles = await db
      .select({ id: files.id, storageKey: files.storageKey })
      .from(files)
      .where(
        and(eq(files.userId, user.id), isNull(files.lastAccessedAt), lte(files.createdAt, cutoff)),
      )
      .limit(perUserLimit);

    const fileRows = [...new Map([...staleFiles, ...legacyFiles].map((f) => [f.id, f])).values()].slice(
      0,
      perUserLimit,
    );

    for (const file of fileRows) {
      if (file.storageKey) {
        await storage.delete(file.storageKey).catch((err) => {
          console.error(`Failed to delete ${file.storageKey} from storage:`, err);
        });
      }
      await db.delete(files).where(eq(files.id, file.id));
      deletedFiles += 1;
    }
  }

  return { deletedNotes, deletedFiles, usersScanned: allUsers.length };
}
