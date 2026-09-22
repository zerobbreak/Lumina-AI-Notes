import type { notifications } from "../db/schema/index.js";

type NotificationRow = typeof notifications.$inferSelect;

export function toNotificationResponse(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body ?? undefined,
    href: row.href ?? undefined,
    createdAt: row.createdAt.getTime(),
    readAt: row.readAt?.getTime(),
  };
}
