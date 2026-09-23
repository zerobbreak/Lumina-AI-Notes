export type ChatModeDto =
  | "explain"
  | "synthesize"
  | "compare"
  | "apply"
  | "quiz"
  | "fill_gaps";

export type ChatSessionDto = {
  id: string;
  userId: string;
  title: string;
  pinnedNoteIds: string[];
  mode: ChatModeDto;
  createdAt: number;
  updatedAt: number;
};

export type ChatMessageNoteDto = {
  id: string;
  title: string;
};

export type ChatMessageDto = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  contextNoteIds: string[];
  createdAt: number;
  notes: ChatMessageNoteDto[];
};

export type ChatContextNoteDto = {
  id: string;
  title: string;
  content: string;
};

export type AssistantReplyDto = {
  messageId: string;
  content: string;
};
