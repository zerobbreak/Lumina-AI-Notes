/**
 * Shared transcript types and normalization utilities.
 * Used by both ai.ts and notes.ts to avoid duplication.
 */

export type TranscriptChunkInput = {
  text?: string;
  enhancedText?: string;
  timestamp?: string;
};

/** Threshold (words) below which transcript enrichment is attempted. */
export const ENRICHMENT_WORD_THRESHOLD = 500;

/**
 * Convert a raw transcript (JSON array or plain text) into a single
 * line-separated string suitable for prompt injection.
 */
export const normalizeTranscriptForPrompt = (rawTranscript: string): string => {
  const fallback = rawTranscript.trim();
  if (!fallback) return "";

  try {
    const parsed = JSON.parse(rawTranscript) as unknown;
    if (!Array.isArray(parsed)) return fallback;

    const lines = parsed
      .map((chunk) => {
        const entry = chunk as TranscriptChunkInput;
        const content = (entry.enhancedText || entry.text || "").trim();
        if (!content) return "";
        const stamp = (entry.timestamp || "").trim();
        return stamp ? `[${stamp}] ${content}` : content;
      })
      .filter((line) => line.length > 0);

    if (lines.length === 0) return fallback;
    return lines.join("\n");
  } catch {
    return fallback;
  }
};
