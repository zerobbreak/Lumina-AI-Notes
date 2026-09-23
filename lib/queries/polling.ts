import type { Query } from "@tanstack/react-query";

/** Tiered refetch intervals — see migration plan §5. */
export const POLL_MS = {
  /** Presence avatars while a note is open */
  presence: 5_000,
  /** Active chat session messages */
  chatMessages: 3_000,
  /** Chat session list while studio is mounted */
  chatSessions: 5_000,
  /** PDF queue while files are pending/processing */
  fileProcessing: 2_000,
  /** Slow check when no files are in the queue */
  fileIdle: 30_000,
  /** Unread badge + open notifications panel */
  notifications: 30_000,
  /** Collaborators dialog while open */
  collaborators: 5_000,
  /** A background AI job (recording -> notes) while it's queued or running */
  job: 2_000,
} as const;

export const STALE_MS = {
  /** Sidebar lists, tags, decks — invalidate on mutation */
  list: 30_000,
  /** Chat reads between polls */
  chat: 2_000,
  /** Note body — local edits; refetch only via invalidation */
  editor: Number.POSITIVE_INFINITY,
} as const;

/** Standard options for interval-based queries (pause when tab is hidden). */
export function pollWhileVisible(intervalMs: number) {
  return {
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  } as const;
}

/** Poll quickly while `hasWork` is true; slow or stop when idle. */
export function pollWhileActive<T>(
  activeMs: number,
  hasWork: (data: T | undefined) => boolean,
  idleMs: number | false = false,
) {
  return {
    refetchInterval: (query: Query<T, Error, T, readonly unknown[]>) => {
      if (typeof document !== "undefined" && document.hidden) return false;
      return hasWork(query.state.data)
        ? activeMs
        : idleMs === false
          ? false
          : idleMs;
    },
    refetchIntervalInBackground: false,
  } as const;
}

/** Editor queries: never auto-refetch; mutations invalidate explicitly. */
export function editorQueryOptions() {
  return {
    staleTime: STALE_MS.editor,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  } as const;
}
