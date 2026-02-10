export type TemplateType = "outline" | "cornell" | "mindmap";

export interface TemplateRecommendationInput {
  majorCode?: string;
  courseId?: string;
  courseTitle?: string;
  courseDefaultStyle?: string;
}

export interface TemplateRecommendationOutput {
  recommendedTemplate: TemplateType | null;
  fallbackOptions: TemplateType[];
  reasoning?: string;
}

const MAJOR_TO_TEMPLATE = new Map<string, TemplateType>([
  ["cs", "outline"],
  ["computer science", "outline"],
  ["engineering", "outline"],
  ["software engineering", "outline"],
  ["bio", "cornell"],
  ["biology", "cornell"],
  ["chem", "cornell"],
  ["chemistry", "cornell"],
  ["medicine", "cornell"],
  ["med", "cornell"],
  ["philosophy", "mindmap"],
  ["humanities", "mindmap"],
  ["history", "mindmap"],
  ["literature", "mindmap"],
]);

const ALL_TEMPLATES: TemplateType[] = ["outline", "cornell", "mindmap"];

function normalize(input?: string) {
  return (input || "").trim().toLowerCase();
}

export function recommendTemplate(
  input: TemplateRecommendationInput,
): TemplateRecommendationOutput {
  const major = normalize(input.majorCode);
  const courseTitle = normalize(input.courseTitle);

  if (input.courseDefaultStyle === "outline" ||
    input.courseDefaultStyle === "cornell" ||
    input.courseDefaultStyle === "mindmap") {
    return {
      recommendedTemplate: input.courseDefaultStyle,
      fallbackOptions: ALL_TEMPLATES.filter((t) => t !== input.courseDefaultStyle),
      reasoning: "Using your course default template",
    };
  }

  let recommended: TemplateType | null = null;

  if (major && MAJOR_TO_TEMPLATE.has(major)) {
    recommended = MAJOR_TO_TEMPLATE.get(major) || null;
  } else if (courseTitle) {
    if (courseTitle.includes("bio") || courseTitle.includes("chem")) {
      recommended = "cornell";
    } else if (courseTitle.includes("philosophy") || courseTitle.includes("humanities")) {
      recommended = "mindmap";
    } else if (courseTitle.includes("computer") || courseTitle.includes("engineering")) {
      recommended = "outline";
    }
  }

  return {
    recommendedTemplate: recommended,
    fallbackOptions: ALL_TEMPLATES,
    reasoning: recommended ? "Based on your major and course context" : undefined,
  };
}
