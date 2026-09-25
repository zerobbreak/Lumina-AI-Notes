"use client";

import { cn } from "@/lib/utils";

export type StudioMode = "graph" | "chat";

/** The Graph / Chat pill. */
export function StudioModeToggle({
  value,
  onChange,
  className,
}: {
  value: StudioMode;
  onChange: (mode: StudioMode) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Studio view"
      className={cn("flex items-center gap-0.5 rounded-full border bg-muted p-0.5", className)}
    >
      {(["graph", "chat"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={value === m}
          onClick={() => onChange(m)}
          className={cn(
            "h-7 rounded-full px-3.5 text-xs font-bold transition-colors",
            value === m
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "graph" ? "Graph" : "Chat"}
        </button>
      ))}
    </div>
  );
}
