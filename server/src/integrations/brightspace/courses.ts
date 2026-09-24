import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { users, type Course } from "../../db/schema/index.js";
import { MAX_COURSES } from "../../routes/courses.js";
import { pickCourseColor } from "../../users/courseColors.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** A course code: letters then digits, e.g. PROG7312, INSY7314, HIST101, CS50A. */
const CODE = /^[A-Z]{2,6}\d{2,4}[A-Z]?$/;

/**
 * Splits a Brightspace course offering name into a course name and code.
 * Offering names carry the code plus enrolment details after it:
 * "Programming 3B PROG7312 2026 FT BCAD0701 EMGPMD Term2 GR02" -> "Programming 3B", "PROG7312".
 * Some schools lead with the code instead: "HIST101 - History of Africa".
 * Without a recognisable code, the whole name is kept and the code is empty.
 */
export function parseCourseName(externalName: string): { name: string; code: string } {
  const tokens = externalName.trim().split(/\s+/).filter(Boolean);
  // "MATH201:" and "PROG7312," still count as codes.
  const bare = (token: string) => token.replace(/[-–:|,.]+$/, "");
  const at = tokens.findIndex((token) => CODE.test(bare(token)));
  if (at > 0) return { name: tokens.slice(0, at).join(" "), code: bare(tokens[at]!) };
  if (at === 0) {
    const rest = tokens.slice(1).join(" ").replace(/^[-–:|]\s*/, "").trim();
    return { name: rest || bare(tokens[0]!), code: bare(tokens[0]!) };
  }
  return { name: externalName.trim().slice(0, 200), code: "" };
}

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Pre-maps a Brightspace course to the student's Lumina course whose code
 * appears in its name ("HIST101 - History of Africa" -> code "HIST 101").
 * Only a single, reasonably specific match counts; otherwise it's no match.
 */
export function matchCourse(externalName: string, own: Course[]): string | null {
  const name = normalize(externalName);
  const matches = own.filter((course) => {
    const code = normalize(course.code ?? "");
    return code.length >= 4 && name.includes(code);
  });
  return matches.length === 1 ? matches[0]!.id : null;
}

/**
 * Finds or creates a Lumina course for each Brightspace course, inside `tx`.
 * An existing course whose code matches is reused; otherwise one is created
 * from the parsed name and code, with a colour, up to the course limit.
 * Locks the user row, like every other edit of users.courses.
 * Returns externalKey -> courseId for the ones it could place.
 */
export async function ensureCourses(
  tx: Tx,
  userId: string,
  external: Array<{ key: string; name: string }>,
): Promise<Map<string, string>> {
  const placed = new Map<string, string>();
  if (external.length === 0) return placed;

  const [row] = await tx
    .select({ courses: users.courses })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  const courses = structuredClone(row?.courses ?? []);
  let created = false;

  for (const course of external) {
    const existing = matchCourse(course.name, courses);
    if (existing) {
      placed.set(course.key, existing);
      continue;
    }
    if (courses.length >= MAX_COURSES) continue;
    const { name, code } = parseCourseName(course.name);
    const made: Course = { id: randomUUID(), name, code, color: pickCourseColor(courses), modules: [] };
    courses.push(made);
    placed.set(course.key, made.id);
    created = true;
  }

  if (created) await tx.update(users).set({ courses }).where(eq(users.id, userId));
  return placed;
}
