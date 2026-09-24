import { ACCENT_SWATCHES } from "./appearance.js";

/**
 * A course's colour is one of the accent swatches, so "accent follows course"
 * can switch the accent to it directly.
 */
export const COURSE_COLORS = ACCENT_SWATCHES;
export type CourseColor = (typeof COURSE_COLORS)[number];

/**
 * The order new courses take colours in: distinct neighbours first, and the
 * default accent (red-pen) last so a course doesn't blend into the chrome.
 * Keep in step with server/drizzle/0009_course_colors.sql.
 */
const ASSIGN_ORDER: readonly CourseColor[] = [
  "indigo",
  "emerald",
  "amber",
  "rose",
  "blue",
  "purple",
  "green",
  "slate",
  "red-pen",
];

/** The least-used colour among `existing`, earliest in the order on a tie. */
export function pickCourseColor(existing: readonly { color?: string }[]): CourseColor {
  const uses = new Map<string, number>();
  for (const c of existing) if (c.color) uses.set(c.color, (uses.get(c.color) ?? 0) + 1);
  let best = ASSIGN_ORDER[0]!;
  for (const color of ASSIGN_ORDER) {
    if ((uses.get(color) ?? 0) < (uses.get(best) ?? 0)) best = color;
  }
  return best;
}

/** Colours for a batch of new courses, each seeing the ones before it. */
export function withCourseColors<T extends object>(
  existing: readonly { color?: string }[],
  added: T[],
): (T & { color: CourseColor })[] {
  const seen: { color?: string }[] = [...existing];
  return added.map((course) => {
    const color = pickCourseColor(seen);
    seen.push({ color });
    return { ...course, color };
  });
}
