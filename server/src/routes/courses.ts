import { randomUUID } from "node:crypto";
import { and, count, countDistinct, eq, inArray, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db/client.js";
import {
  deadlines,
  documents,
  files,
  flashcardDecks,
  noteCollaborators,
  notes,
  quizDecks,
  users,
  type Course,
  type CourseModule,
} from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import type { Storage } from "../storage/s3.js";
import { noteStyle } from "./users.js";
import { parse } from "./validation.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const createCourseBody = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(50),
});

const updateCourseBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  defaultNoteStyle: noteStyle.optional(),
  templatePromptDisabled: z.boolean().optional(),
});

const moduleBody = z.object({ title: z.string().trim().min(1).max(200) });

/**
 * Courses live in one jsonb value on the user row, which every request loads,
 * so an unbounded list would slow down everything that user does. Onboarding
 * already caps courses at 50.
 */
export const MAX_COURSES = 50;
export const MAX_MODULES_PER_COURSE = 100;

/**
 * Runs `fn` against the caller's course list with their user row locked, then
 * saves the list. Courses are one jsonb value, so without the lock two quick
 * edits (rename + add module) would each overwrite the other's change.
 */
async function withCourses<T>(
  db: Db,
  userId: string,
  fn: (courses: Course[], tx: Tx) => T | Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ courses: users.courses })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    const courses = structuredClone(row?.courses ?? []);
    const result = await fn(courses, tx);
    await tx.update(users).set({ courses }).where(eq(users.id, userId));
    return result;
  });
}

function findCourse(courses: Course[], courseId: string) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) throw new HttpError(404, "Course not found", "not_found");
  return course;
}

function findModule(course: Course, moduleId: string) {
  const module = course.modules?.find((m) => m.id === moduleId);
  if (!module) throw new HttpError(404, "Module not found", "not_found");
  return module;
}

/** A course or module, by the column that files rows under it. */
type Scope = { column: "courseId" | "moduleId"; id: string };

type Owned = PgTable & { userId: PgColumn };

/**
 * The caller's rows filed under the scope. Only notes and deadlines can sit
 * in a module; files and decks are filed by course alone.
 */
function ownedTables(scope: Scope): Record<string, [Owned, PgColumn]> {
  return {
    notes: [notes, notes[scope.column]],
    deadlines: [deadlines, deadlines[scope.column]],
    ...(scope.column === "courseId" && {
      files: [files, files.courseId],
      flashcardDecks: [flashcardDecks, flashcardDecks.courseId],
      quizDecks: [quizDecks, quizDecks.courseId],
    }),
  };
}

const inScope = (table: Owned, column: PgColumn, userId: string, scope: Scope) =>
  and(eq(table.userId, userId), eq(column, scope.id));

async function countContents(db: Db, userId: string, scope: Scope) {
  const counts: Record<string, number> = {};
  for (const [name, [table, column]] of Object.entries(ownedTables(scope))) {
    const [{ n }] = await db.select({ n: count() }).from(table).where(inScope(table, column, userId, scope));
    counts[name] = n;
  }

  // Notes someone else can open; deleting takes them away from those people too.
  const [{ n: sharedNotes }] = await db
    .select({ n: countDistinct(noteCollaborators.noteId) })
    .from(noteCollaborators)
    .innerJoin(notes, eq(notes.id, noteCollaborators.noteId))
    .where(
      and(
        eq(notes.userId, userId),
        eq(notes[scope.column], scope.id),
        ne(noteCollaborators.userId, userId),
      ),
    );
  return { ...counts, sharedNotes };
}

/**
 * Hard-deletes everything filed under the course or module. The database
 * cascades from these rows to tags, cards, questions, reminders, collaborators
 * and so on. Returns the bucket keys to remove once the transaction commits.
 */
async function deleteContents(tx: Tx, userId: string, scope: Scope) {
  const storageKeys: string[] = [];
  for (const [table, column] of Object.values(ownedTables(scope))) {
    if (table === files) {
      const removed = await tx
        .delete(files)
        .where(inScope(files, column, userId, scope))
        .returning({ storageKey: files.storageKey });
      storageKeys.push(...removed.flatMap((f) => (f.storageKey ? [f.storageKey] : [])));
    } else {
      await tx.delete(table).where(inScope(table, column, userId, scope));
    }
  }
  if (storageKeys.length > 0) {
    // Embedded chunks of those uploads, as DELETE /files/:id does.
    await tx.delete(documents).where(inArray(documents.storageKey, storageKeys));
  }
  return storageKeys;
}

/** Port of the course half of convex/users.ts. Courses live in users.courses. */
export function createCoursesRouter(db: Db, storage: Storage) {
  const router = Router();

  async function deleteObjects(keys: string[]) {
    // The rows are gone either way; a failed delete only leaves an orphan object.
    await Promise.all(
      keys.map((key) =>
        storage.delete(key).catch((err) => {
          console.error(`Failed to delete ${key} from storage:`, err);
        }),
      ),
    );
  }

  // createCourse
  router.post("/", async (req, res) => {
    const body = parse(createCourseBody, req.body);
    const course = await withCourses(db, currentUser(res).id, (courses) => {
      if (courses.length >= MAX_COURSES) {
        throw new HttpError(400, `You can have at most ${MAX_COURSES} courses`, "too_many_courses");
      }
      const created: Course = { id: randomUUID(), ...body, modules: [] };
      courses.push(created);
      return created;
    });
    res.status(201).json(course);
  });

  // renameCourse / updateCourseStyle
  router.patch("/:courseId", async (req, res) => {
    const body = parse(updateCourseBody, req.body);
    const course = await withCourses(db, currentUser(res).id, (courses) =>
      Object.assign(findCourse(courses, req.params.courseId), body),
    );
    res.json(course);
  });

  router.get("/:courseId/delete-preview", async (req, res) => {
    const user = currentUser(res);
    findCourse(user.courses ?? [], req.params.courseId);
    res.json(await countContents(db, user.id, { column: "courseId", id: req.params.courseId }));
  });

  // deleteCourse. Convex left the course's notes behind; here they go with it.
  router.delete("/:courseId", async (req, res) => {
    const { courseId } = req.params;
    const userId = currentUser(res).id;
    const keys = await withCourses(db, userId, (courses, tx) => {
      courses.splice(courses.indexOf(findCourse(courses, courseId)), 1);
      return deleteContents(tx, userId, { column: "courseId", id: courseId });
    });
    await deleteObjects(keys);
    res.status(204).end();
  });

  // addModuleToCourse
  router.post("/:courseId/modules", async (req, res) => {
    const { title } = parse(moduleBody, req.body);
    const module = await withCourses(db, currentUser(res).id, (courses) => {
      const course = findCourse(courses, req.params.courseId);
      if ((course.modules?.length ?? 0) >= MAX_MODULES_PER_COURSE) {
        throw new HttpError(
          400,
          `A course can have at most ${MAX_MODULES_PER_COURSE} modules`,
          "too_many_modules",
        );
      }
      const created: CourseModule = { id: randomUUID(), title };
      course.modules = [...(course.modules ?? []), created];
      return created;
    });
    res.status(201).json(module);
  });

  // renameModule
  router.patch("/:courseId/modules/:moduleId", async (req, res) => {
    const { title } = parse(moduleBody, req.body);
    const module = await withCourses(db, currentUser(res).id, (courses) =>
      Object.assign(findModule(findCourse(courses, req.params.courseId), req.params.moduleId), { title }),
    );
    res.json(module);
  });

  router.get("/:courseId/modules/:moduleId/delete-preview", async (req, res) => {
    const user = currentUser(res);
    findModule(findCourse(user.courses ?? [], req.params.courseId), req.params.moduleId);
    res.json(await countContents(db, user.id, { column: "moduleId", id: req.params.moduleId }));
  });

  // deleteModule
  router.delete("/:courseId/modules/:moduleId", async (req, res) => {
    const { courseId, moduleId } = req.params;
    const userId = currentUser(res).id;
    await withCourses(db, userId, async (courses, tx) => {
      const course = findCourse(courses, courseId);
      const module = findModule(course, moduleId);
      course.modules = course.modules?.filter((m) => m !== module);
      await deleteContents(tx, userId, { column: "moduleId", id: moduleId });
    });
    res.status(204).end();
  });

  return router;
}
