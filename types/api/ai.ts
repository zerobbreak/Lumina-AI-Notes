export type FlashcardPair = { front: string; back: string };

export type StructuredNotesSection = {
  id: string;
  type: string;
  content: string;
  level?: number;
};

export type StructuredNotesResult = {
  summary: string;
  sections: StructuredNotesSection[];
  actionItems: string[];
  reviewQuestions: string[];
  diagramData?: unknown;
  outlineHtml?: string;
};

export type IsolateTranscribeResult = {
  transcript: string;
  success: boolean;
  isolated: boolean;
  isolatedStorageKey?: string;
  error?: string;
};

export type AskAboutFileResult = {
  success: boolean;
  answer?: string;
  error?: string;
};

export type ProcessDocumentResult = {
  success: boolean;
  error?: string;
};

export type GenerateNotesFromDocumentResult = {
  success: boolean;
  content?: string;
  title?: string;
  sourceDocument?: { id: string; name: string };
  error?: string;
};

export type DocumentReferenceResult = {
  success: boolean;
  reference?: {
    summary: string;
    relevantExcerpts: string[];
    citation: string;
  };
  error?: string;
};

export type GenerateDeckResult = {
  success: boolean;
  deckId?: string;
  cardCount?: number;
  error?: string;
};

export type IngestGenerateNoteResult = {
  success: boolean;
  noteId?: string;
  title?: string;
  error?: string;
};
