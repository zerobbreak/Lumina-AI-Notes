"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { filterSessions, groupSessionsByRecency, sessionSubline } from "@/lib/studio/sessions";
import type { StudioChat } from "@/lib/hooks/chats/useStudioChat";

/** Left rail in Chat mode: search, chats grouped by recency, delete / delete all. */
export function StudioChatRail({ chat }: { chat: StudioChat }) {
  const { sessions, activeSessionId, selectSession, newChat, removeSession, removeAllSessions, confirmDeleteAll } =
    chat;
  const [query, setQuery] = useState("");
  // "This week" is judged against when the rail mounted; close enough for a list.
  const [now] = useState(() => Date.now());

  const groups = useMemo(
    () => groupSessionsByRecency(filterSessions(sessions, query), now),
    [sessions, query, now],
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/20 md:flex">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <span className="text-sm font-semibold tracking-tight">Studio</span>
        <Button onClick={() => void newChat()} variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      <div className="px-3 pb-2">
        <div className="flex h-8 items-center gap-2 rounded-md border bg-background/60 px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 pb-2">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {query.trim() ? "No chats match." : "No chats yet."}
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label ?? "all"} className="space-y-0.5">
            {group.label && (
              <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.sessions.map((session) => (
              <div
                key={session._id}
                className={cn(
                  "group flex w-full items-center rounded-lg transition-colors",
                  activeSessionId === session._id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <button
                  type="button"
                  onClick={() => selectSession(session._id)}
                  className="flex min-w-0 flex-1 flex-col rounded-lg px-2.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "truncate text-[13px]",
                      activeSessionId === session._id ? "font-semibold" : "font-medium",
                    )}
                  >
                    {session.title}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{sessionSubline(session)}</span>
                </button>
                <div className="shrink-0 pr-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void removeSession(session._id);
                    }}
                    aria-label="Delete chat"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {sessions.length > 0 && (
        <div className="border-t p-2">
          <Button
            onClick={() => void removeAllSessions()}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2 text-muted-foreground hover:text-destructive",
              confirmDeleteAll && "text-destructive",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDeleteAll ? "Click again to delete all" : "Delete all chats"}
          </Button>
        </div>
      )}
    </aside>
  );
}
