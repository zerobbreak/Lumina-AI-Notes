/**
 * Note Style Recommendations Configuration
 * Maps majors to note-taking styles and theme configurations
 */

export interface StyleRecommendation {
  primary: "cornell" | "outline" | "mindmap";
  secondary: "cornell" | "outline" | "mindmap";
  reason: string;
}

export interface MajorTheme {
  accent: string;
  gradient: string;
  aiTemperature: number; // Lower = more precise (STEM), Higher = more creative (humanities)
}

// Major to style recommendations mapping
export const majorStyleRecommendations: Record<string, StyleRecommendation> = {
  cs: {
    primary: "outline",
    secondary: "cornell",
    reason:
      "Hierarchical bullet points work well for code concepts and algorithms",
  },
  engineering: {
    primary: "cornell",
    secondary: "outline",
    reason: "Cornell method helps separate formulas, definitions and examples",
  },
  medicine: {
    primary: "cornell",
    secondary: "mindmap",
    reason: "Structured notes with cue columns aid medical terminology recall",
  },
  biology: {
    primary: "mindmap",
    secondary: "cornell",
    reason: "Visual connections help with complex biological systems",
  },
  law: {
    primary: "cornell",
    secondary: "outline",
    reason: "Case analysis benefits from the Cornell split-page format",
  },
  history: {
    primary: "outline",
    secondary: "mindmap",
    reason: "Chronological outlines help organize historical events",
  },
  business: {
    primary: "outline",
    secondary: "cornell",
    reason: "Bullet points work well for business frameworks and models",
  },
  other: {
    primary: "outline",
    secondary: "cornell",
    reason: "Versatile format for general studies",
  },
};

// Major to theme mapping
export const majorThemes: Record<string, MajorTheme> = {
  cs: {
    accent: "indigo",
    gradient: "from-indigo-600 to-violet-600",
    aiTemperature: 0.3,
  },
  engineering: {
    accent: "amber",
    gradient: "from-amber-600 to-orange-600",
    aiTemperature: 0.2,
  },
  medicine: {
    accent: "emerald",
    gradient: "from-emerald-600 to-teal-600",
    aiTemperature: 0.3,
  },
  biology: {
    accent: "green",
    gradient: "from-green-600 to-emerald-600",
    aiTemperature: 0.4,
  },
  law: {
    accent: "slate",
    gradient: "from-slate-600 to-zinc-600",
    aiTemperature: 0.3,
  },
  history: {
    accent: "rose",
    gradient: "from-rose-600 to-pink-600",
    aiTemperature: 0.6,
  },
  business: {
    accent: "blue",
    gradient: "from-blue-600 to-cyan-600",
    aiTemperature: 0.5,
  },
  other: {
    accent: "purple",
    gradient: "from-purple-600 to-fuchsia-600",
    aiTemperature: 0.5,
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
 * Get the theme configuration for a given major
 * @param major - The major identifier (e.g., 'cs', 'engineering')
 * @returns MajorTheme object with accent color, gradient, and AI temperature
 */
export function getMajorTheme(major: string): MajorTheme {
  return majorThemes[major] || majorThemes.other;
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
