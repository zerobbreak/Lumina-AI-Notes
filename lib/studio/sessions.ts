import type { ChatModeDto } from "@/types/api/chats";

export type ChatMode = ChatModeDto;

export const MODE_LABELS: Record<ChatMode, string> = {
  explain: "Explain",
  synthesize: "Synthesize",
  compare: "Compare",
  apply: "Apply",
  quiz: "Quiz me",
  fill_gaps: "Fill gaps",
};

export const CHAT_MODES = Object.keys(MODE_LABELS) as ChatMode[];

export function modeLabel(mode: string | undefined | null): string {
  return MODE_LABELS[(mode ?? "explain") as ChatMode] ?? MODE_LABELS.explain;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type SessionLike = {
  title: string;
  createdAt?: number;
  updatedAt?: number;
};

export type SessionGroup<T> = { label: string | null; sessions: T[] };

function sessionTime(s: SessionLike): number | undefined {
  const t = s.updatedAt ?? s.createdAt;
  return typeof t === "number" && Number.isFinite(t) ? t : undefined;
}

/** Case-insensitive title filter; an empty query keeps everything. */
export function filterSessions<T extends SessionLike>(sessions: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}

/**
 * Splits chats into "This week" (touched in the last 7 days) and "Earlier",
 * keeping the incoming order. If any chat has no timestamp there's nothing to
 * group by, so everything comes back as one unlabelled group.
 */
export function groupSessionsByRecency<T extends SessionLike>(
  sessions: T[],
  now: number,
): SessionGroup<T>[] {
  if (sessions.length === 0) return [];
  if (sessions.some((s) => sessionTime(s) === undefined)) {
    return [{ label: null, sessions }];
  }
  const cutoff = now - WEEK_MS;
  const thisWeek = sessions.filter((s) => (sessionTime(s) as number) >= cutoff);
  const earlier = sessions.filter((s) => (sessionTime(s) as number) < cutoff);
  const groups: SessionGroup<T>[] = [];
  if (thisWeek.length > 0) groups.push({ label: "This week", sessions: thisWeek });
  if (earlier.length > 0) groups.push({ label: "Earlier", sessions: earlier });
  return groups;
}

export function pluralNotes(n: number): string {
  return `${n} ${n === 1 ? "note" : "notes"}`;
}

/** "Explain · 3 notes" — the muted sub-line under a chat in the rail. */
export function sessionSubline(session: { mode?: string; pinnedNoteIds?: unknown[] }): string {
  const count = Array.isArray(session.pinnedNoteIds) ? session.pinnedNoteIds.length : 0;
  return `${modeLabel(session.mode)} · ${pluralNotes(count)}`;
}

/**
 * Orders the pinned notes the way the session stores them, which is the order
 * the reply prompt numbers them in — so "1" in the context rail is [#1].
 */
export function orderPinnedNotes<T extends { id: string }>(notes: T[], pinnedIds: string[]): T[] {
  const index = new Map(pinnedIds.map((id, i) => [id, i]));
  return [...notes].sort(
    (a, b) => (index.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (index.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
