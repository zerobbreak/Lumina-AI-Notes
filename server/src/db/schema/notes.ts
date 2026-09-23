import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  vector,
} from "drizzle-orm/pg-core";
import {
  createdAt,
  EMBEDDING_DIMENSIONS,
  id,
  searchVector,
  timestamptz,
  updatedAt,
} from "./columns.js";
import { files } from "./files.js";
import { recordings } from "./recordings.js";
import { users } from "./users.js";

export type OutlineMetadata = {
  totalItems: number;
  completedTasks: number;
  /** Ids of collapsed outline nodes */
  collapsedNodes: string[];
};

export const notes = pgTable(
  "notes",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    content: text(),
    /** "quick" | "page" */
    noteType: text(),
    major: text(),
    // Ids from users.courses JSON, so no foreign key.
    courseId: text(),
    moduleId: text(),
    // Convex left children pointing at a deleted parent (so they vanished);
    // here they become top-level pages instead.
    parentNoteId: text().references((): AnyPgColumn => notes.id, { onDelete: "set null" }),
    style: text(),
    isPinned: boolean().notNull().default(false),
    isArchived: boolean().notNull().default(false),
    isShared: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** Bumped when the note is opened or edited; drives stale cleanup. */
    lastAccessedAt: timestamptz(),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    /** True once auto-tagging has run, so it only fires once. */
    autoTagAttempted: boolean().notNull().default(false),
    wordCount: integer(),
    /**
     * Bumped by every content save. Saves send the version they started from,
     * so two people autosaving a shared note get a conflict instead of one
     * silently overwriting the other. Opening, pinning etc. don't bump it.
     */
    version: integer().notNull().default(0),

    // Quick capture
    /** "text" | "voice" */
    quickCaptureType: text(),
    quickCaptureAudioUrl: text(),
    /** "draft" | "expanded" */
    quickCaptureStatus: text(),
    quickCaptureExpandedNoteId: text().references((): AnyPgColumn => notes.id, {
      onDelete: "set null",
    }),

    // Outline mode. outlineData stays a JSON string, as the client parses it.
    outlineData: text(),
    outlineMetadata: jsonb().$type<OutlineMetadata>(),

    /** Set when the note was generated from a saved recording. */
    sourceRecordingId: text().references(() => recordings.id, { onDelete: "set null" }),
    /**
     * The processing job writing into this note. The editor stays read-only
     * while it's set; cleared when the job succeeds, kept on failure so the
     * note can offer a retry. No foreign key: processing_jobs points here.
     */
    generationJobId: text(),

    searchTitle: searchVector("title"),
    searchContent: searchVector("content"),
  },
  (t) => [
    index().on(t.userId, t.createdAt),
    index().on(t.userId, t.lastAccessedAt),
    index().on(t.userId, t.sourceRecordingId),
    index().on(t.userId, t.isPinned),
    index().on(t.userId, t.isArchived),
    index().on(t.userId, t.noteType),
    index().on(t.courseId),
    index().on(t.moduleId),
    index().on(t.parentNoteId),
    index("notes_search_title_idx").using("gin", t.searchTitle),
    index("notes_search_content_idx").using("gin", t.searchContent),
    index("notes_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** Hex code or preset name */
    color: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.userId, t.name)],
);

/** Was notes.tagIds */
export const noteTags = pgTable(
  "note_tags",
  {
    noteId: text()
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: text()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tagId] }), index().on(t.tagId)],
);

/** Was notes.linkedDocumentIds: source files cited by a note. */
export const noteLinkedFiles = pgTable(
  "note_linked_files",
  {
    noteId: text()
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    fileId: text()
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.fileId] }), index().on(t.fileId)],
);
