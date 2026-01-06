/**
 * Centralized type exports
 * Import all types from this file for convenience
 */

// Core application types
export type {
  Module,
  Course,
  UserFile,
  Note,
  Recording,
  UserData,
  FlashcardDeck,
  Flashcard,
} from "./core";

// Editor types
export type { CornellData, OutlineMetadata, NoteStyleType } from "./editor";

// Diagram/MindMap types
export type {
  NodeType,
  MindMapNode,
  MindMapEdge,
  LayoutType,
  LayoutOptions,
  ExportOptions,
} from "./diagram";
