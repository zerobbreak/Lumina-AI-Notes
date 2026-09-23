export type FlashcardPair = { front: string; back: string };

export type AskAboutFileResult = {
  success: boolean;
  answer?: string;
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
