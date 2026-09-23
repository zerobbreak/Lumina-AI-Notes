import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { documents, files, notes } from "../db/schema/index.js";

export type VectorHit = { id: string; score: number };

function vectorSql(embedding: number[]) {
  return sql.raw(`'[${embedding.map((v) => Number(v.toFixed(8))).join(",")}]'::vector`);
}

/** Cosine-distance search on notes.embedding for one user. */
export async function searchNotesByEmbedding(
  db: Db,
  userId: string,
  embedding: number[],
  limit: number,
): Promise<VectorHit[]> {
  const vec = vectorSql(embedding);
  const rows = await db
    .select({
      id: notes.id,
      score: sql<number>`(1 - (${notes.embedding} <=> ${vec}))`.as("score"),
    })
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.embedding)))
    .orderBy(sql`${notes.embedding} <=> ${vec}`)
    .limit(limit);
  return rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

/** Cosine-distance search on files.embedding for one user. */
export async function searchFilesByEmbedding(
  db: Db,
  userId: string,
  embedding: number[],
  limit: number,
): Promise<VectorHit[]> {
  const vec = vectorSql(embedding);
  const rows = await db
    .select({
      id: files.id,
      score: sql<number>`(1 - (${files.embedding} <=> ${vec}))`.as("score"),
    })
    .from(files)
    .where(and(eq(files.userId, userId), isNotNull(files.embedding)))
    .orderBy(sql`${files.embedding} <=> ${vec}`)
    .limit(limit);
  return rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

/**
 * Chunk search within one uploaded file's chunks. `storageKey` is required:
 * the documents table holds every user's chunks, so an unscoped search would
 * hand one user's documents to another.
 */
export async function searchDocumentsByEmbedding(
  db: Db,
  embedding: number[],
  limit: number,
  storageKey: string,
): Promise<Array<VectorHit & { text: string }>> {
  const vec = vectorSql(embedding);
  const rows = await db
    .select({
      id: documents.id,
      text: documents.text,
      score: sql<number>`(1 - (${documents.embedding} <=> ${vec}))`.as("score"),
    })
    .from(documents)
    .where(eq(documents.storageKey, storageKey))
    .orderBy(sql`${documents.embedding} <=> ${vec}`)
    .limit(limit);
  return rows.map((r) => ({ id: r.id, text: r.text, score: Number(r.score) }));
}
