import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { NoteDetailDto, NoteListItemDto } from "@/types/api/notes";

/** Full note shape the editor expects, with REST optimistic-concurrency version. */
export type NoteEditorModel = Doc<"notes"> & { version: number };

/** Card/list shape the dashboard still uses (`_id`, `content` snippet, etc.). */
export type NoteCardModel = {
  _id: Id<"notes">;
  title: string;
  content?: string;
  createdAt: number;
  isPinned?: boolean;
  courseId?: string;
  moduleId?: string;
  outlineData?: string;
  linkedDocumentIds?: Array<Id<"files">>;
  sourceRecordingId?: Id<"recordings">;
  wordCount?: number;
  quickCaptureStatus?: string;
};

export type SidebarNoteModel = {
  _id: Id<"notes">;
  title: string;
  isArchived?: boolean;
  isShared?: boolean;
  isPinned?: boolean;
  noteType?: string;
  quickCaptureType?: string;
  parentNoteId?: string;
  courseId?: string;
  moduleId?: string;
  createdAt: number;
};

export function noteListItemToSidebar(note: NoteListItemDto): SidebarNoteModel {
  return {
    _id: note.id as Id<"notes">,
    title: note.title,
    isArchived: note.isArchived,
    isShared: note.isShared,
    isPinned: note.isPinned,
    noteType: note.noteType ?? undefined,
    parentNoteId: note.parentNoteId ?? undefined,
    courseId: note.courseId ?? undefined,
    moduleId: note.moduleId ?? undefined,
    createdAt: note.createdAt,
  };
}

export function noteListItemsToSidebar(notes: NoteListItemDto[]) {
  return notes.map(noteListItemToSidebar);
}

export type OpenNoteModel = {
  _id: Id<"notes">;
  courseId?: string;
  moduleId?: string;
  parentNoteId?: string;
  title: string;
};

export function noteDetailToEditor(dto: NoteDetailDto): NoteEditorModel {
  return {
    _id: dto.id as Id<"notes">,
    _creationTime: dto.createdAt,
    userId: dto.userId,
    title: dto.title,
    content: dto.content ?? undefined,
    noteType: dto.noteType ?? undefined,
    major: dto.major ?? undefined,
    courseId: dto.courseId ?? undefined,
    moduleId: dto.moduleId ?? undefined,
    parentNoteId: (dto.parentNoteId ?? undefined) as Id<"notes"> | undefined,
    style: dto.style ?? undefined,
    isPinned: dto.isPinned,
    isArchived: dto.isArchived,
    isShared: dto.isShared,
    createdAt: dto.createdAt,
    lastAccessedAt: dto.lastAccessedAt ?? undefined,
    linkedDocumentIds: dto.linkedDocumentIds as Array<Id<"files">>,
    tagIds: dto.tagIds as Array<Id<"tags">>,
    wordCount: dto.wordCount ?? undefined,
    outlineData: dto.outlineData ?? undefined,
    outlineMetadata: dto.outlineMetadata ?? undefined,
    quickCaptureType: dto.quickCaptureType ?? undefined,
    quickCaptureAudioUrl: dto.quickCaptureAudioUrl ?? undefined,
    quickCaptureStatus: dto.quickCaptureStatus ?? undefined,
    quickCaptureExpandedNoteId: (dto.quickCaptureExpandedNoteId ?? undefined) as
      | Id<"notes">
      | undefined,
    sourceRecordingId: (dto.sourceRecordingId ?? undefined) as Id<"recordings"> | undefined,
    version: dto.version,
  };
}

export type ChildNoteModel = { _id: Id<"notes">; title: string };

export function noteListItemToChildNote(note: NoteListItemDto): ChildNoteModel {
  return {
    _id: note.id as Id<"notes">,
    title: note.title,
  };
}

export function toOpenNote(dto: NoteDetailDto): OpenNoteModel {
  return {
    _id: dto.id as Id<"notes">,
    title: dto.title,
    courseId: dto.courseId ?? undefined,
    moduleId: dto.moduleId ?? undefined,
    parentNoteId: dto.parentNoteId ?? undefined,
  };
}

export function noteListItemToCard(note: NoteListItemDto): NoteCardModel {
  return {
    _id: note.id as Id<"notes">,
    title: note.title,
    content: note.preview,
    createdAt: note.createdAt,
    isPinned: note.isPinned,
    courseId: note.courseId ?? undefined,
    moduleId: note.moduleId ?? undefined,
    outlineData: note.hasOutline ? " " : undefined,
    linkedDocumentIds: note.linkedDocumentIds as Array<Id<"files">>,
    sourceRecordingId: (note.sourceRecordingId ?? undefined) as Id<"recordings"> | undefined,
    wordCount: note.wordCount ?? undefined,
    quickCaptureStatus: note.quickCaptureStatus ?? undefined,
  };
}
