"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { aiApi } from "@/lib/api/domains/ai.api";
import { useApiToken } from "@/lib/api/use-api-token";
import type {
  AskAboutFileResult,
  DocumentReferenceResult,
  FlashcardPair,
  GenerateDeckResult,
  GenerateNotesFromDocumentResult,
  IngestGenerateNoteResult,
} from "@/types/api/ai";

export function useAiActions() {
  const { getApiToken } = useApiToken();

  const simplifyText = useCallback(
    async (args: { text: string }) => {
      const token = await getApiToken();
      const res = await aiApi.simplifyText(token, args.text);
      return res.text;
    },
    [getApiToken],
  );

  const expandText = useCallback(
    async (args: { text: string }) => {
      const token = await getApiToken();
      const res = await aiApi.expandText(token, args.text);
      return res.text;
    },
    [getApiToken],
  );

  const continueText = useCallback(
    async (args: { text: string; fullContext?: string }) => {
      const token = await getApiToken();
      const res = await aiApi.continueText(token, args.text, args.fullContext);
      return res.text;
    },
    [getApiToken],
  );

  const generateFlashcards = useCallback(
    async (args: { text: string; count?: number }): Promise<FlashcardPair[]> => {
      const token = await getApiToken();
      return aiApi.generateFlashcards(token, args.text, args.count);
    },
    [getApiToken],
  );

  const askAboutContext = useCallback(
    async (args: {
      question: string;
      context: string;
      contextType?: "note" | "transcript" | "general";
    }) => {
      const token = await getApiToken();
      const res = await aiApi.askAboutContext(token, args);
      return res.text;
    },
    [getApiToken],
  );

  const askAboutFile = useCallback(
    async (args: { fileId: Id<"files">; question: string }): Promise<AskAboutFileResult> => {
      const token = await getApiToken();
      return aiApi.askAboutFile(token, args.fileId, args.question);
    },
    [getApiToken],
  );

  const getDocumentReference = useCallback(
    async (args: {
      fileId: Id<"files">;
      currentNoteContent?: string;
      maxLength?: number;
    }): Promise<DocumentReferenceResult> => {
      const token = await getApiToken();
      return aiApi.getDocumentReference(token, args);
    },
    [getApiToken],
  );

  const generateNotesFromDocument = useCallback(
    async (args: {
      fileId: Id<"files">;
      topic?: string;
      noteStyle?: string;
    }): Promise<GenerateNotesFromDocumentResult> => {
      const token = await getApiToken();
      return aiApi.generateNotesFromDocument(token, args);
    },
    [getApiToken],
  );

  const generateAndSaveFlashcards = useCallback(
    async (args: {
      noteId: Id<"notes">;
      title: string;
      count?: number;
    }): Promise<GenerateDeckResult> => {
      const token = await getApiToken();
      return aiApi.generateAndSaveFlashcards(token, args);
    },
    [getApiToken],
  );

  const generateAndSaveQuiz = useCallback(
    async (args: {
      noteId: Id<"notes">;
      title: string;
      count?: number;
    }): Promise<GenerateDeckResult> => {
      const token = await getApiToken();
      return aiApi.generateAndSaveQuiz(token, args);
    },
    [getApiToken],
  );

  const ingestAndGenerateNote = useCallback(
    async (args: {
      storageId: string;
      fileName: string;
      courseId?: string;
    }): Promise<IngestGenerateNoteResult> => {
      const token = await getApiToken();
      return aiApi.ingestAndGenerateNote(token, {
        storageKey: args.storageId,
        fileName: args.fileName,
        courseId: args.courseId,
      });
    },
    [getApiToken],
  );

  const ingestAndGenerateFlashcards = useCallback(
    async (args: {
      storageId: string;
      fileName: string;
      courseId?: string;
      cardCount?: number;
    }): Promise<GenerateDeckResult> => {
      const token = await getApiToken();
      return aiApi.ingestAndGenerateFlashcards(token, {
        storageKey: args.storageId,
        fileName: args.fileName,
        courseId: args.courseId,
        cardCount: args.cardCount,
      });
    },
    [getApiToken],
  );

  const extractFormulaFromImage = useCallback(
    async (args: {
      imageBase64: string;
      mimeType: string;
      courseContext?: string;
    }) => {
      const token = await getApiToken();
      return aiApi.extractFormulaFromImage(token, args);
    },
    [getApiToken],
  );

  return {
    simplifyText,
    expandText,
    continueText,
    generateFlashcards,
    askAboutContext,
    askAboutFile,
    getDocumentReference,
    generateNotesFromDocument,
    generateAndSaveFlashcards,
    generateAndSaveQuiz,
    ingestAndGenerateNote,
    ingestAndGenerateFlashcards,
    extractFormulaFromImage,
  };
}
