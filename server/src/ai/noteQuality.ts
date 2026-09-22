/**
 * Shared text analysis and JSON parsing utilities.
 * Ported from convex/shared/noteQuality.ts verbatim.
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
export const tryParseJson = (text: string): unknown => {
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
 * Check whether a note section lacks substantive depth.
 * Returns `true` if the note is too shallow by heuristic measures.
 */
export const noteLacksDepth = (
  text: string,
  opts?: { minWords?: number; minSentences?: number },
): boolean => {
  const minWords = opts?.minWords ?? 40;
  const minSentences = opts?.minSentences ?? 3;
  const lower = text.toLowerCase();
  const words = wordCountFn(text);
  const sentences = sentenceCount(text);
  const hasGenericSignal = GENERIC_SIGNALS.some((sig) => lower.includes(sig));
  const hasConcreteSignal = CONCRETE_SIGNAL_RE.test(text);
  return (
    sentences < minSentences ||
    words < minWords ||
    hasGenericSignal ||
    !hasConcreteSignal
  );
};

/**
 * How much depth to expect from a note depends on how much material the
 * source transcript actually contained — a two-minute voice memo shouldn't
 * be held to the same bar as a 50-minute lecture.
 */
export type DepthTier = "brief" | "moderate" | "extensive";

export const getDepthTier = (transcriptWordCount: number): DepthTier => {
  if (transcriptWordCount < 250) return "brief";
  if (transcriptWordCount < 1200) return "moderate";
  return "extensive";
};

const DEPTH_TIER_THRESHOLDS: Record<
  DepthTier,
  {
    minSections: number;
    minAvgWords: number;
    minWords: number;
    minSentences: number;
  }
> = {
  brief: { minSections: 2, minAvgWords: 15, minWords: 15, minSentences: 2 },
  moderate: { minSections: 4, minAvgWords: 30, minWords: 30, minSentences: 3 },
  extensive: { minSections: 5, minAvgWords: 50, minWords: 40, minSentences: 3 },
};

/**
 * Decide whether generated sections are shallow enough to warrant a repair
 * pass, with thresholds scaled to the source transcript's length so short
 * recordings aren't forced through a padding-driven repair loop.
 */
export const needsDepthRepair = (
  sections: Array<{ type?: string; content: string }>,
  transcriptWordCount: number,
): boolean => {
  const { minSections, minAvgWords, minWords, minSentences } =
    DEPTH_TIER_THRESHOLDS[getDepthTier(transcriptWordCount)];

  const paragraphSections = sections.filter((s) => s.type === "paragraph");
  const avgParagraphWords =
    paragraphSections.length > 0
      ? paragraphSections.reduce((sum, s) => sum + wordCountFn(s.content), 0) /
        paragraphSections.length
      : 0;

  return (
    sections.length < minSections ||
    (paragraphSections.length > 0 && avgParagraphWords < minAvgWords) ||
    paragraphSections.some((s) =>
      noteLacksDepth(s.content, { minWords, minSentences }),
    )
  );
};
