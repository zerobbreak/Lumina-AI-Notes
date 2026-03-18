/**
 * Shared text analysis and JSON parsing utilities.
 * Used by both ai.ts and notes.ts for structured note generation.
 */

/** Count sentences by splitting on sentence-ending punctuation. */
export const sentenceCount = (text: string): number =>
  text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

/** Count words by splitting on whitespace. */
export const wordCountFn = (text: string): number =>
  text.split(/\s+/).filter((w) => w.length > 0).length;

/**
 * Try to extract and parse a JSON object from a string.
 * Returns null if no valid JSON object is found.
 */
export const tryParseJson = (text: string): any => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
};

/**
 * Generic signals indicating a note is surface-level and lacks depth.
 */
const GENERIC_SIGNALS = [
  "will be explored",
  "in future",
  "important concept",
  "key point",
  "topic is",
  "it is important",
  "this concept",
  "students should",
  "further study",
  "as mentioned",
];

/**
 * Regex matching concrete, substantive content signals.
 */
const CONCRETE_SIGNAL_RE =
  /\d|for example|e\.g\.|such as|because|therefore|used to|works by|defined as|means|specifically|in particular|according to|demonstrated by|calculated as|results in|consists of|involves/i;

/**
 * Check whether a Cornell note entry lacks substantive depth.
 * Returns `true` if the note is too shallow by heuristic measures.
 */
export const noteLacksDepth = (text: string): boolean => {
  const lower = text.toLowerCase();
  const words = wordCountFn(text);
  const sentences = sentenceCount(text);
  const hasGenericSignal = GENERIC_SIGNALS.some((sig) => lower.includes(sig));
  const hasConcreteSignal = CONCRETE_SIGNAL_RE.test(text);
  return sentences < 3 || words < 40 || hasGenericSignal || !hasConcreteSignal;
};
