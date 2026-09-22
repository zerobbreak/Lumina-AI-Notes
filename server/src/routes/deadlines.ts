import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { createRemindersForDeadline, deleteRemindersForDeadline } from "../deadlines/reminders.js";
import { toDeadlineResponse } from "../deadlines/serialize.js";
import type { Db } from "../db/client.js";
import { deadlines } from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

const rowId = z.string().min(1).max(200);
const kind = z.enum(["assignment", "exam", "event", "task"]);

const createBody = z.object({
  title: z.string().trim().min(1).max(500),
  dueAt: z.number().int().min(0),
  kind,
  courseId: rowId.optional(),
  moduleId: rowId.optional(),
  notes: z.string().max(10_000).optional(),
});

const updateBody = z
  .object({
    title: z.string().trim().min(1).max(500),
    dueAt: z.number().int().min(0),
    kind,
    courseId: rowId.nullable(),
    moduleId: rowId.nullable(),
    notes: z.string().max(10_000).nullable(),
    completed: z.boolean(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Send at least one field to update" });

const upcomingQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
  includeCompleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

async function requireOwnedDeadline(db: Db, deadlineId: string, userId: string) {
  const [row] = await db
    .select()
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.userId, userId)))
    .limit(1);
  if (!row) throw new HttpError(404, "Deadline not found", "not_found");
  return row;
}

/** Port of convex/deadlines.ts */
export function createDeadlinesRouter(db: Db) {
  const router = Router();

  router.post("/", async (req, res) => {
    const user = currentUser(res);
    const body = parse(createBody, req.body);
    const now = new Date();

    const [created] = await db
      .insert(deadlines)
      .values({
        userId: user.id,
        title: body.title,
        dueAt: new Date(body.dueAt),
        kind: body.kind,
        courseId: body.courseId,
        moduleId: body.moduleId,
        notes: body.notes,
        updatedAt: now,
      })
      .returning();

    await createRemindersForDeadline(db, {
      userId: user.id,
      deadlineId: created!.id,
      dueAt: created!.dueAt,
    });

    res.status(201).json({ id: created!.id });
  });

  router.get("/upcoming", async (req, res) => {
    const user = currentUser(res);
    const { limit = 8, windowDays = 30, includeCompleted = false } = parse(upcomingQuery, req.query);
    const now = Date.now();
    const end = now + windowDays * 24 * 60 * 60 * 1000;

    const conditions = [
      eq(deadlines.userId, user.id),
      gte(deadlines.dueAt, new Date(now)),
      lte(deadlines.dueAt, new Date(end)),
    ];
    if (!includeCompleted) conditions.push(isNull(deadlines.completedAt));

    const rows = await db
      .select()
      .from(deadlines)
      .where(and(...conditions))
      .orderBy(deadlines.dueAt)
      .limit(limit);

    res.json(rows.map(toDeadlineResponse));
  });

  router.patch("/:id", async (req, res) => {
    const user = currentUser(res);
    const body = parse(updateBody, req.body);
    const existing = await requireOwnedDeadline(db, req.params.id, user.id);
    const now = new Date();

    const patch: Partial<typeof deadlines.$inferInsert> = { updatedAt: now };
    if (body.title !== undefined) patch.title = body.title;
    if (body.kind !== undefined) patch.kind = body.kind;
    if (body.courseId !== undefined) patch.courseId = body.courseId;
    if (body.moduleId !== undefined) patch.moduleId = body.moduleId;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.dueAt !== undefined) patch.dueAt = new Date(body.dueAt);
    if (body.completed !== undefined) patch.completedAt = body.completed ? now : null;

    const [updated] = await db
      .update(deadlines)
      .set(patch)
      .where(eq(deadlines.id, existing.id))
      .returning();

    const dueAtNext = body.dueAt !== undefined ? new Date(body.dueAt) : existing.dueAt;
    const completedNext =
      body.completed === undefined ? existing.completedAt != null : body.completed;

    await deleteRemindersForDeadline(db, existing.id);
    if (!completedNext) {
      await createRemindersForDeadline(db, {
        userId: user.id,
        deadlineId: existing.id,
        dueAt: dueAtNext,
      });
    }

    res.json(toDeadlineResponse(updated!));
  });

  router.delete("/:id", async (req, res) => {
    const user = currentUser(res);
    const existing = await requireOwnedDeadline(db, req.params.id, user.id);
    await deleteRemindersForDeadline(db, existing.id);
    await db.delete(deadlines).where(eq(deadlines.id, existing.id));
    res.json({ deleted: true });
  });

  return router;
}
