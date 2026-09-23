"use client";

import type { ReactNode } from "react";
import type { WorldInfo } from "@/lib/appearance/catalog";
import type { ResolvedMode } from "@/lib/appearance/model";
import { cn } from "@/lib/utils";

/** Pieces shared by the Appearance settings tab and the sidebar switcher. */

/** A tiny window of the world: sidebar, a card with text lines, the accent. */
export function WorldPreview({
  world,
  mode,
  className,
}: {
  world: WorldInfo;
  mode: ResolvedMode;
  className?: string;
}) {
  const p = world.preview[mode];
  const hsl = (v: string) => `hsl(${v})`;
  return (
    <div
      aria-hidden
      className={cn("flex h-20 overflow-hidden rounded-lg border", className)}
      style={{ background: hsl(p.background), borderColor: hsl(p.border) }}
    >
      <div
        className="w-1/4 border-r p-1.5 space-y-1"
        style={{ background: hsl(p.sidebar), borderColor: hsl(p.border) }}
      >
        <div className="h-1 w-3/4 rounded-full" style={{ background: hsl(p.muted) }} />
        <div className="h-1 w-1/2 rounded-full bg-primary" />
        <div className="h-1 w-2/3 rounded-full" style={{ background: hsl(p.muted) }} />
      </div>
      <div className="flex-1 p-2">
        <div
          className="h-full rounded-md border p-1.5 space-y-1"
          style={{ background: hsl(p.card), borderColor: hsl(p.border) }}
        >
          <div className="h-1.5 w-1/2 rounded-full" style={{ background: hsl(p.foreground) }} />
          <div className="h-1 w-5/6 rounded-full" style={{ background: hsl(p.muted) }} />
          <div className="h-1 w-2/3 rounded-full" style={{ background: hsl(p.muted) }} />
          <div className="mt-1.5 h-2 w-8 rounded-sm bg-primary" />
        </div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-inset p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-md font-medium transition-colors",
            size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
