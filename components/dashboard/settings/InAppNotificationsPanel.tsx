"use client";

import { Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useMarkAllNotificationsRead } from "@/lib/mutations/notifications/useMarkAllNotificationsRead";
import { useMarkNotificationRead } from "@/lib/mutations/notifications/useMarkNotificationRead";
import { useNotifications } from "@/lib/queries/notifications/useNotifications";
import { useUnreadNotificationCount } from "@/lib/queries/notifications/useUnreadNotificationCount";
import { cn } from "@/lib/utils";

export function InAppNotificationsPanel() {
  if (!isRestApiEnabled()) {
    return (
      <p className="text-sm text-muted-foreground">
        In-app notifications are available when the Express API is connected (
        <code className="text-xs">NEXT_PUBLIC_API_URL</code>).
      </p>
    );
  }

  return <InAppNotificationsPanelRest />;
}

function InAppNotificationsPanelRest() {
  const { data: notifications, isLoading } = useNotifications({ limit: 30 });
  const { data: unread } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unread?.count ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread reminder${unreadCount === 1 ? "" : "s"}`
            : "You're all caught up"}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading notifications…
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No notifications yet.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <li
                key={n.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm",
                  isUnread
                    ? "border-primary/25 bg-primary/5"
                    : "border-border/60 bg-muted/10 opacity-80",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{n.title}</p>
                    {n.body ? (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-[11px] px-2"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
