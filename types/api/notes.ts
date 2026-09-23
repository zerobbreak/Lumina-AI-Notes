/** List item from `/notes/recent`, `/notes/pinned`, etc. */
export type NoteListItemDto = {
  id: string;
  userId: string;
  title: string;
  noteType?: string | null;
  major?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  parentNoteId?: string | null;
  style?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number | null;
  wordCount?: number | null;
  sourceRecordingId?: string | null;
  preview: string;
  hasOutline: boolean;
  linkedDocumentIds: string[];
  quickCaptureStatus?: string | null;
};

export type OutlineMetadataDto = {
  totalItems: number;
  completedTasks: number;
  collapsedNodes: string[];
};

/** Full note from `GET /notes/:id`. */
export type NoteDetailDto = {
  id: string;
  userId: string;
  title: string;
  content?: string | null;
  noteType?: string | null;
  major?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  parentNoteId?: string | null;
  style?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number | null;
  tagIds: string[];
  linkedDocumentIds: string[];
  wordCount?: number | null;
  outlineData?: string | null;
  outlineMetadata?: OutlineMetadataDto | null;
  quickCaptureType?: string | null;
  quickCaptureAudioUrl?: string | null;
  quickCaptureStatus?: string | null;
  quickCaptureExpandedNoteId?: string | null;
  sourceRecordingId?: string | null;
  version: number;
};

export type UpdateNoteBody = {
  title?: string;
  content?: string;
  style?: string;
  outlineData?: string;
  outlineMetadata?: OutlineMetadataDto;
  tagIds?: string[];
  wordCount?: number;
  quickCaptureType?: string;
  quickCaptureAudioUrl?: string;
  quickCaptureStatus?: string;
  quickCaptureExpandedNoteId?: string;
  sourceRecordingId?: string;
  isArchived?: boolean;
  isPinned?: boolean;
  isShared?: boolean;
  version?: number;
};
