"use client";

import { cn } from "@/lib/utils";
import type { Neighbourhood } from "@/lib/studio/neighbourhood";

export const MINI_MAP_WIDTH = 280;
export const MINI_MAP_HEIGHT = 170;

/**
 * Static picture of the chat's context: pinned notes (filled) in the middle,
 * their unpinned neighbours (hollow) around them. Clicking it is the caller's
 * way into the full graph.
 */
export function NeighbourhoodMiniMap({
  hood,
  onClick,
  className,
}: {
  hood: Neighbourhood;
  onClick?: () => void;
  className?: string;
}) {
  const pos = new Map(hood.nodes.map((n) => [n.id, n]));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full overflow-hidden rounded-xl border bg-muted/30 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="Open the neighbourhood in the graph"
      title="Open in graph"
    >
      <svg
        viewBox={`0 0 ${MINI_MAP_WIDTH} ${MINI_MAP_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-hidden="true"
      >
        {hood.edges.map((e) => {
          const a = pos.get(e.source);
          const b = pos.get(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.source}-${e.target}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={e.type === "wikilink" ? "stroke-primary/60" : "stroke-muted-foreground/40"}
              strokeWidth={e.type === "wikilink" ? 1.5 : 1}
              strokeDasharray={e.type === "wikilink" ? undefined : "3 3"}
            />
          );
        })}
        {hood.nodes.map((n) => (
          <g key={n.id}>
            <title>{n.title}</title>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.pinned ? 7 : 5}
              className={
                n.pinned
                  ? "fill-primary stroke-background"
                  : "fill-background stroke-muted-foreground"
              }
              strokeWidth={n.pinned ? 2 : 1.25}
            />
          </g>
        ))}
      </svg>
    </button>
  );
}
