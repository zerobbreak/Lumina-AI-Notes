import type { OutlineMetadata } from "@/types/editor";

/** String-branded IDs (replaces Convex Id<Table>). */
export type Id<TableName extends string = string> = string & {
  readonly __tableName?: TableName;
};

/** Note document shape used by the editor and adapters. */
export type NoteDoc = {
  _id: Id<"notes">;
  _creationTime: number;
  userId: string;
  title: string;
  content?: string;
  noteType?: string;
  major?: string;
  courseId?: string;
  moduleId?: string;
  parentNoteId?: Id<"notes">;
  style?: string;
  isPinned: boolean;
  isArchived: boolean;
  isShared: boolean;
  createdAt: number;
  lastAccessedAt?: number;
  linkedDocumentIds: Array<Id<"files">>;
  tagIds: Array<Id<"tags">>;
  wordCount?: number;
  outlineData?: string;
  outlineMetadata?: OutlineMetadata;
  quickCaptureType?: string;
  quickCaptureAudioUrl?: string;
  quickCaptureStatus?: string;
  quickCaptureExpandedNoteId?: Id<"notes">;
  sourceRecordingId?: Id<"recordings">;
  version?: number;
};

/** Table-specific document shapes for legacy Doc<> usages. */
export type Doc<TableName extends string> = TableName extends "notes"
  ? NoteDoc
  : Record<string, unknown> & {
      _id: Id<TableName>;
      _creationTime: number;
    };
