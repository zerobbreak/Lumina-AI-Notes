import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type {
  AskAboutFileResult,
  DocumentReferenceResult,
  FlashcardPair,
  GenerateDeckResult,
  GenerateNotesFromDocumentResult,
  IngestGenerateNoteResult,
} from "@/types/api/ai";

export const aiApi = {
  simplifyText(token: string, text: string) {
    return apiFetch<{ text: string }>(apiPath`/ai/simplify-text`, {
      method: "POST",
      token,
      body: { text },
    });
  },

  expandText(token: string, text: string) {
    return apiFetch<{ text: string }>(apiPath`/ai/expand-text`, {
      method: "POST",
      token,
      body: { text },
    });
  },

  continueText(token: string, text: string, fullContext?: string) {
    return apiFetch<{ text: string }>(apiPath`/ai/continue-text`, {
      method: "POST",
      token,
      body: { text, fullContext },
    });
  },

  generateFlashcards(token: string, text: string, count?: number) {
    return apiFetch<FlashcardPair[]>(apiPath`/ai/generate-flashcards`, {
      method: "POST",
      token,
      body: { text, count },
    });
  },

  askAboutContext(
    token: string,
    body: { question: string; context: string; contextType?: "note" | "transcript" | "general" },
  ) {
    return apiFetch<{ text: string }>(apiPath`/ai/ask-about-context`, {
      method: "POST",
      token,
      body,
    });
  },

  askAboutFile(token: string, fileId: string, question: string) {
    return apiFetch<AskAboutFileResult>(apiPath`/ai/ask-about-file`, {
      method: "POST",
      token,
      body: { fileId, question },
    });
  },

  getDocumentReference(
    token: string,
    body: { fileId: string; currentNoteContent?: string; maxLength?: number },
  ) {
    return apiFetch<DocumentReferenceResult>(apiPath`/ai/get-document-reference`, {
      method: "POST",
      token,
      body,
    });
  },

  generateNotesFromDocument(
    token: string,
    body: { fileId: string; topic?: string; noteStyle?: string },
  ) {
    return apiFetch<GenerateNotesFromDocumentResult>(apiPath`/ai/generate-notes-from-document`, {
      method: "POST",
      token,
      body,
    });
  },

  generateAndSaveFlashcards(
    token: string,
    body: { noteId: string; title: string; count?: number },
  ) {
    return apiFetch<GenerateDeckResult>(apiPath`/ai/generate-and-save-flashcards`, {
      method: "POST",
      token,
      body,
    });
  },

  generateAndSaveQuiz(
    token: string,
    body: { noteId: string; title: string; count?: number },
  ) {
    return apiFetch<GenerateDeckResult>(apiPath`/ai/generate-and-save-quiz`, {
      method: "POST",
      token,
      body,
    });
  },

  ingestAndGenerateNote(
    token: string,
    body: {
      storageKey?: string;
      pdfBase64?: string;
      fileName: string;
      courseId?: string;
    },
  ) {
    return apiFetch<IngestGenerateNoteResult>(apiPath`/ai/ingest-and-generate-note`, {
      method: "POST",
      token,
      body,
    });
  },

  ingestAndGenerateFlashcards(
    token: string,
    body: {
      storageKey?: string;
      pdfBase64?: string;
      fileName: string;
      courseId?: string;
      cardCount?: number;
    },
  ) {
    return apiFetch<GenerateDeckResult>(apiPath`/ai/ingest-and-generate-flashcards`, {
      method: "POST",
      token,
      body,
    });
  },

  extractFormulaFromImage(
    token: string,
    body: { imageBase64: string; mimeType: string; courseContext?: string },
  ) {
    return apiFetch<{
      success: boolean;
      latex?: string;
      description?: string;
      confidence?: "high" | "medium" | "low";
      error?: string;
    }>(apiPath`/ai/extract-formula-from-image`, {
      method: "POST",
      token,
      body,
    });
  },
};
