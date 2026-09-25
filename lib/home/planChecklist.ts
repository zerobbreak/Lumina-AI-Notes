"use client";

import { useCallback, useState } from "react";
import type { PlanItemDto } from "@/types/api/home";

/**
 * Today's plan as a checklist. Ticked items stay where they were, struck
 * through, even after the server stops returning them (a finished deadline,
 * cards all reviewed). Ticks live in this browser for the day only.
 */

export type DoneEntry = { item: PlanItemDto; index: number };
export type ChecklistRow = { item: PlanItemDto; done: boolean };

const STORAGE_PREFIX = "lumina:home-plan-done:";

export function dayKey(now: number) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The server's plan with today's ticked items put back at the place they had. */
export function mergeChecklist(plan: PlanItemDto[], done: DoneEntry[]): ChecklistRow[] {
  const doneIds = new Set(done.map((d) => d.item.id));
  const rows: ChecklistRow[] = plan.filter((p) => !doneIds.has(p.id)).map((item) => ({ item, done: false }));
  for (const entry of [...done].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(entry.index, rows.length), 0, { item: entry.item, done: true });
  }
  return rows;
}

function read(key: string): DoneEntry[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DoneEntry[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, entries: DoneEntry[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
    // Yesterday's ticks are no use.
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX) && k !== key) window.localStorage.removeItem(k);
    }
  } catch {
    // Private mode or storage full: the ticks just won't survive a reload.
  }
}

/**
 * Home and each course page share one day's ticks, so ticking an item in one
 * ticks it in the other. `keep` limits which ticked items a page puts back
 * (a course page shows only its own).
 */
export function usePlanChecklist(plan: PlanItemDto[], now: number, keep?: (item: PlanItemDto) => boolean) {
  const key = STORAGE_PREFIX + dayKey(now);
  const [state, setState] = useState(() => ({ key, done: read(key) }));
  // A new day (or first data) starts from that day's stored ticks.
  const done = state.key === key ? state.done : read(key);

  const rows = mergeChecklist(plan, keep ? done.filter((d) => keep(d.item)) : done);

  const setDone = useCallback(
    (item: PlanItemDto, index: number, isDone: boolean) => {
      const current = state.key === key ? state.done : read(key);
      const next = isDone
        ? [...current.filter((d) => d.item.id !== item.id), { item, index }]
        : current.filter((d) => d.item.id !== item.id);
      write(key, next);
      setState({ key, done: next });
    },
    [key, state],
  );

  return { rows, setDone };
}
