import type { deadlines } from "../db/schema/index.js";

type DeadlineRow = typeof deadlines.$inferSelect;

export function toDeadlineResponse(row: DeadlineRow) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    dueAt: row.dueAt.getTime(),
    kind: row.kind,
    courseId: row.courseId ?? undefined,
    moduleId: row.moduleId ?? undefined,
    notes: row.notes ?? undefined,
    completedAt: row.completedAt?.getTime(),
    source: row.source,
    externalUrl: row.externalUrl ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}
