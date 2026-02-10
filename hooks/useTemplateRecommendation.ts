import { useMemo } from "react";
import { recommendTemplate, TemplateRecommendationOutput } from "@/lib/templates/recommendation";
import type { Course } from "@/types";

interface UseTemplateRecommendationInput {
  major?: string;
  courseId?: string;
  courses?: Course[];
  courseTitle?: string;
}

export function useTemplateRecommendation({
  major,
  courseId,
  courses,
  courseTitle,
}: UseTemplateRecommendationInput): TemplateRecommendationOutput {
  return useMemo(() => {
    const course = courses?.find((c) => c.id === courseId);
    return recommendTemplate({
      majorCode: major,
      courseId,
      courseTitle: course?.name || courseTitle,
      courseDefaultStyle: course?.defaultNoteStyle,
    });
  }, [major, courseId, courses, courseTitle]);
}
