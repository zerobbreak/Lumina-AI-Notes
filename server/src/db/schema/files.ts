import {
  bigint,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  vector,
} from "drizzle-orm/pg-core";
import {
  createdAt,
  EMBEDDING_DIMENSIONS,
  id,
  searchVector,
  timestamptz,
} from "./columns.js";
import { users } from "./users.js";

export const files = pgTable(
  "files",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** "pdf" | "img" | "link" */
    type: text().notNull(),
    /** External URL for links; uploaded files are served from `storageKey`. */
    url: text(),
    /** Object key in the Railway bucket (was a Convex storage id). */
    storageKey: text(),
    contentType: text(),
    sizeBytes: bigint({ mode: "number" }),
    courseId: text(),
    createdAt: createdAt(),
    /** Bumped when the file is opened; drives stale cleanup. */
    lastAccessedAt: timestamptz(),

    // Document processing
    extractedText: text(),
    summary: text(),
    keyTopics: text().array(),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    /** "pending" | "processing" | "done" | "error" */
    processingStatus: text(),
    processedAt: timestamptz(),
    /** When the current run claimed the file; lets a run that died mid-way be retried. */
    processingStartedAt: timestamptz(),
    queuePosition: integer(),
    progressPercent: doublePrecision(),
    errorMessage: text(),

    searchName: searchVector("name"),
  },
  (t) => [
    index().on(t.userId, t.courseId),
    index().on(t.userId, t.createdAt),
    index().on(t.userId, t.lastAccessedAt),
    index().on(t.processingStatus),
    index("files_search_name_idx").using("gin", t.searchName),
    index("files_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

/** Embedded chunks of uploaded course material, used for grounded answers. */
export const documents = pgTable(
  "documents",
  {
    id: id(),
    /** Bucket object key of the source file. */
    storageKey: text().notNull(),
    /** e.g. "REQ-001" */
    courseId: text().notNull(),
    text: text().notNull(),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.storageKey),
    index().on(t.courseId),
    index("documents_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

/**
 * Bytes a user has been granted upload URLs for, per UTC day. Uploads go
 * straight to the bucket, so this is counted when a URL is signed: it bounds
 * how fast one account can fill storage, whether or not the bytes are kept.
 */
export const uploadDailyUsage = pgTable(
  "upload_daily_usage",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** UTC calendar day, "YYYY-MM-DD". */
    day: date({ mode: "string" }).notNull(),
    bytes: bigint({ mode: "number" }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index().on(t.day)],
);
