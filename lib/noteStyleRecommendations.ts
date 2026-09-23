/**
 * Note Style Recommendations Configuration
 * Maps majors to note-taking styles and enabled blocks
 */

export interface StyleRecommendation {
  primary: "standard" | "outline" | "mindmap";
  secondary: "standard" | "outline" | "mindmap";
  reason: string;
}

// Major to style recommendations mapping
export const majorStyleRecommendations: Record<string, StyleRecommendation> = {
  cs: {
    primary: "outline",
    secondary: "standard",
    reason:
      "Hierarchical bullet points work well for code concepts and algorithms",
  },
  engineering: {
    primary: "standard",
    secondary: "outline",
    reason: "Standard format helps organize formulas, definitions and examples",
  },
  medicine: {
    primary: "standard",
    secondary: "mindmap",
    reason: "Structured notes with cue columns aid medical terminology recall",
  },
  biology: {
    primary: "mindmap",
    secondary: "standard",
    reason: "Visual connections help with complex biological systems",
  },
  law: {
    primary: "standard",
    secondary: "outline",
    reason: "Case analysis benefits from the standard section-based format",
  },
  history: {
    primary: "outline",
    secondary: "mindmap",
    reason: "Chronological outlines help organize historical events",
  },
  business: {
    primary: "outline",
    secondary: "standard",
    reason: "Bullet points work well for business frameworks and models",
  },
  other: {
    primary: "outline",
    secondary: "standard",
    reason: "Versatile format for general studies",
  },
};

/**
 * Get the recommended note-taking style for a given major
 * @param major - The major identifier (e.g., 'cs', 'engineering')
 * @returns StyleRecommendation object with primary/secondary styles and reasoning
 */
export function getStyleRecommendation(major: string): StyleRecommendation {
  return majorStyleRecommendations[major] || majorStyleRecommendations.other;
}

/**
 * Get the enabled blocks/features based on the user's major
 * Different majors have access to different specialized note blocks
 * @param major - The major identifier (e.g., 'cs', 'engineering')
 * @returns Array of enabled block type identifiers
 */
export function getEnabledBlocksForMajor(major: string): string[] {
  const baseBlocks = ["text", "quiz", "flashcard"];

  switch (major) {
    case "cs":
      return [...baseBlocks, "code-sandbox", "diagram"];
    case "engineering":
    case "math":
      return [...baseBlocks, "graphing", "equation", "diagram"];
    case "medicine":
    case "biology":
      return [...baseBlocks, "diagram", "image-annotation"];
    case "law":
    case "history":
      return [...baseBlocks, "timeline", "citation"];
    case "business":
      return [...baseBlocks, "chart", "diagram"];
    default:
      return baseBlocks;
  }
}
