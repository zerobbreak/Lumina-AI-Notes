/**
 * Editor-related type definitions
 */

// Section-based note structure (Notion-like approach)
export interface NoteSection {
  id: string;
  type: "heading" | "paragraph" | "bullets" | "numbered" | "quote" | "divider";
  content: string;
  level?: number; // For headings: 1, 2, 3
}

// Structured sections data for notes
export interface SectionsData {
  sections: NoteSection[];
}

// Outline metadata for tracking outline structure
export interface OutlineMetadata {
  totalItems: number;
  completedTasks: number;
  collapsedNodes: string[];
}

// Note style types - removed "cornell", keeping flexible formats
export type NoteStyleType = "standard" | "outline" | "mindmap";
