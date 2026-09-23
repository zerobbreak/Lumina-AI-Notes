import type { Id } from "@/types/data-model";
import type {
  ChatContextNoteDto,
  ChatMessageDto,
  ChatSessionDto,
} from "@/types/api/chats";

export type ChatSessionModel = Omit<ChatSessionDto, "id"> & {
  _id: Id<"chatSessions">;
};

export type ChatMessageModel = Omit<ChatMessageDto, "id" | "sessionId" | "contextNoteIds" | "notes"> & {
  _id: Id<"chatMessages">;
  sessionId: Id<"chatSessions">;
  contextNoteIds?: Id<"notes">[];
  notes?: Array<{ id: Id<"notes">; title: string }>;
};

export type ChatContextNoteModel = {
  id: Id<"notes">;
  title: string;
  content: string;
};

export function toChatSession(dto: ChatSessionDto): ChatSessionModel {
  const { id, ...rest } = dto;
  return { ...rest, _id: id as Id<"chatSessions"> };
}

export function toChatSessions(rows: ChatSessionDto[]) {
  return rows.map(toChatSession);
}

export function toChatMessage(dto: ChatMessageDto): ChatMessageModel {
  return {
    _id: dto.id as Id<"chatMessages">,
    sessionId: dto.sessionId as Id<"chatSessions">,
    role: dto.role,
    content: dto.content,
    contextNoteIds: dto.contextNoteIds as Id<"notes">[],
    createdAt: dto.createdAt,
    notes: dto.notes.map((n) => ({
      id: n.id as Id<"notes">,
      title: n.title,
    })),
  };
}

export function toChatMessages(rows: ChatMessageDto[]) {
  return rows.map(toChatMessage);
}

export function toChatContextNotes(rows: ChatContextNoteDto[]): ChatContextNoteModel[] {
  return rows.map((n) => ({
    id: n.id as Id<"notes">,
    title: n.title,
    content: n.content,
  }));
}
