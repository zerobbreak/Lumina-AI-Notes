/**
 * Editor-related type definitions
 */

// Cornell Notes data structure
export interface CornellData {
  cornellCues: string;
  cornellNotes: string;
  cornellSummary: string;
}

// Outline metadata for tracking outline structure
export interface OutlineMetadata {
  totalItems: number;
  completedTasks: number;
  collapsedNodes: string[];
}

// Note style types
export type NoteStyleType = "standard" | "cornell" | "outline" | "mindmap";
