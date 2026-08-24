import { useMemo, useState } from "react";
import { Bookmark, Clock, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { NoteCard, type NoteLabelLookup } from "./NoteCard";

type NoteLike = Parameters<typeof NoteCard>[0]["note"];

type TabId = "recent" | "pinned";

function SegmentedButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 px-2.5 text-xs rounded-full transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/70 dark:hover:bg-white/5",
      )}
    >
      <span className="mr-1.5 inline-flex items-center">{icon}</span>
      {children}
    </Button>
  );
}

export function NotesRail({
  recentNotes,
  pinnedNotes,
  onRequestPinned,
  onOpenNote,
  lookupLabels,
  className,
}: {
  recentNotes: NoteLike[] | undefined;
  pinnedNotes: NoteLike[] | undefined;
  onRequestPinned?: () => void;
  onOpenNote: (id: Id<"notes">) => void;
  lookupLabels?: NoteLabelLookup;
  className?: string;
}) {
  const [tab, setTab] = useState<TabId>("recent");

  const items = useMemo(() => {
    if (tab === "pinned") return pinnedNotes ?? [];
    return recentNotes ?? [];
  }, [tab, pinnedNotes, recentNotes]);

  const headerMeta = useMemo(() => {
    const count = items.length;
    if (tab === "pinned") return { label: "Pinned notes", count };
    return { label: "Recent notes", count };
  }, [items.length, tab]);

  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
              Notes
            </h2>
            <span className="text-[10px] text-muted-foreground/80">
              {headerMeta.count > 0 ? `${headerMeta.count} ${headerMeta.count === 1 ? "item" : "items"}` : "—"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            Fast to scan. Built for studying.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/15 p-1 dark:bg-white/5">
          <SegmentedButton
            active={tab === "recent"}
            icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
            onClick={() => setTab("recent")}
          >
            Recent
          </SegmentedButton>
          <SegmentedButton
            active={tab === "pinned"}
            icon={<Pin className="h-3.5 w-3.5" aria-hidden />}
            onClick={() => {
              setTab("pinned");
              onRequestPinned?.();
            }}
          >
            Pinned
          </SegmentedButton>
        </div>
      </div>

      {/* Horizontal card rail (all breakpoints) */}
      <div className="relative">
        <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-2 pr-1 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
          {items.length > 0 ? (
            items.map((n) => (
              <div
                key={n._id}
                className="snap-start min-w-[280px] max-w-[320px] sm:min-w-[320px] sm:max-w-[360px]"
              >
                <NoteCard
                  note={n}
                  onOpen={onOpenNote}
                  lookupLabels={lookupLabels}
                  className="h-full"
                />
              </div>
            ))
          ) : (
            <div className="w-full rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:ring-0">
              {tab === "pinned" ? (
                <div className="space-y-1">
                  <p className="text-foreground font-medium">No pinned notes.</p>
                  <p className="text-xs text-muted-foreground">
                    Pin important pages to keep them within reach.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-foreground font-medium">
                    No recent notes yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create a note and it’ll show up here automatically.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

