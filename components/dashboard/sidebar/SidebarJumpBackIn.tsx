"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = "pinned" | "recent";

const STORAGE_KEY = "lumina.sidebar.jumpBackIn";

function readTab(): Tab {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "pinned" ? "pinned" : "recent";
  } catch {
    return "recent";
  }
}

interface SidebarJumpBackInProps<T> {
  pinned: readonly T[] | undefined;
  recent: readonly T[] | undefined;
  renderNote: (note: T) => ReactNode;
}

/**
 * Pinned and recent notes behind one switch, so the two lists share a single
 * slot in the sidebar instead of stacking. The last tab chosen is remembered.
 */
export function SidebarJumpBackIn<T>({ pinned, recent, renderNote }: SidebarJumpBackInProps<T>) {
  const [tab, setTab] = useState<Tab>(readTab);
  const baseId = useId();

  const choose = (next: Tab) => {
    setTab(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Losing the preference is fine.
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pinned", label: "Pinned", count: pinned?.length ?? 0 },
    { id: "recent", label: "Recent", count: recent?.length ?? 0 },
  ];
  const notes = tab === "pinned" ? pinned : recent;

  return (
    <div className="space-y-1">
      <div
        role="tablist"
        aria-label="Jump back in"
        className="mx-0.5 flex gap-0.5 rounded-[7px] bg-sidebar-accent/50 p-0.5"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel`}
            onClick={() => choose(t.id)}
            className={cn(
              "flex h-[22px] flex-1 items-center justify-center gap-1 rounded-[5px] text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              tab === t.id
                ? "bg-sidebar font-medium text-sidebar-foreground shadow-sm"
                : "text-muted-foreground hover:text-sidebar-foreground",
            )}
          >
            {t.label}
            {t.count > 0 && <span className="text-[10.5px] tabular-nums opacity-60">{t.count}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}`} className="space-y-px">
        {notes?.length ? (
          notes.map(renderNote)
        ) : (
          <p className="px-2 py-1 text-[12px] text-muted-foreground/70">
            {tab === "pinned" ? "Pin a note to keep it here" : "No recent notes"}
          </p>
        )}
      </div>
    </div>
  );
}
