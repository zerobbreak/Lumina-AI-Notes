/**
 * Types for Streaming Notes Generation & Code Block Extraction
 */

// ============================================================================
// Streaming Notes
// ============================================================================

/** Phases of the streaming notes lifecycle */
export type StreamingPhase =
  | "idle"
  | "generating"
  | "animating"
  | "complete"
  | "error";

/** State managed by the useNotesStream hook */
export interface StreamingNotesState {
  /** Whether the generation/animation is actively running */
  isStreaming: boolean;
  /** Accumulated visible content (grows during animation) */
  content: string;
  /** Full content received from the backend (set once generation completes) */
  fullContent: string;
  /** Progress percentage 0-100 */
  progress: number;
  /** Current phase of the streaming lifecycle */
  phase: StreamingPhase;
  /** Error message if phase === 'error' */
  error?: string;
}

/** Initial/reset state for the streaming hook */
export const INITIAL_STREAMING_STATE: StreamingNotesState = {
  isStreaming: false,
  content: "",
  fullContent: "",
  progress: 0,
  phase: "idle",
};

// ============================================================================
// Code Block Extraction
// ============================================================================

/** Supported languages for extracted code blocks */
export const CODE_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "sql",
  "html",
  "css",
  "bash",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "r",
  "matlab",
  "pseudocode",
  "other",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

/** An extracted code block from a transcript */
export interface CodeBlock {
  /** Unique identifier */
  id: string;
  /** Programming language */
  language: CodeLanguage;
  /** The extracted code content */
  content: string;
  /** Starting character index in the transcript */
  startIndex: number;
  /** Ending character index in the transcript */
  endIndex: number;
  /** Optional user-provided label/description */
  label?: string;
}

// ============================================================================
// Enriched Transcript Builder
// ============================================================================

/**
 * Builds an enriched transcript string by appending formatted code blocks.
 * This is used to give the AI more context about code found in the lecture.
 */
export function buildEnrichedTranscript(
  normalizedTranscript: string,
  codeBlocks?: CodeBlock[],
): string {
  if (!codeBlocks || codeBlocks.length === 0) {
    return normalizedTranscript;
  }

  const codeSection = codeBlocks
    .map((block, i) => {
      const label = block.label ? ` (${block.label})` : "";
      return `--- Code Block ${i + 1}${label} [${block.language}] ---\n\`\`\`${block.language}\n${block.content}\n\`\`\``;
    })
    .join("\n\n");

  return `${normalizedTranscript}\n\n=== EXTRACTED CODE BLOCKS FROM LECTURE ===\n${codeSection}`;
}
