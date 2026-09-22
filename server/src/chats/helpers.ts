import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { chatSessions } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";

type ChatSessionRow = typeof chatSessions.$inferSelect;

export async function requireSessionOwner(db: Db, sessionId: string, userId: string): Promise<ChatSessionRow> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);
  if (!session) {
    throw new HttpError(404, "Chat session not found", "not_found");
  }
  return session;
}

export function toSessionResponse(row: ChatSessionRow) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    pinnedNoteIds: row.pinnedNoteIds ?? [],
    mode: row.mode ?? "explain",
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}
