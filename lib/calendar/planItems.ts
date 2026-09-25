import type { PlanItemDto } from "@/types/api/home";

/** A plan item as a short line: "Review 12 flashcards", "Retake Week 3 quiz". */
export function planTitle(item: PlanItemDto) {
  if (item.kind === "review") return `Review ${item.dueCount} flashcard${item.dueCount === 1 ? "" : "s"}`;
  if (item.kind === "weak-quiz") return `Retake ${item.title}`;
  return item.kind === "overdue" ? `Catch up: ${item.deadline.title}` : item.deadline.title;
}

/** The module a plan item is about, when it's about one. */
export function planCourseId(item: PlanItemDto) {
  if (item.kind === "review") return item.urgentCourseId ?? (item.byCourse.length === 1 ? item.byCourse[0]!.courseId : null);
  if (item.kind === "weak-quiz") return item.courseId;
  return item.deadline.courseId;
}
