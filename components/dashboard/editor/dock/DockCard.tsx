"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The floating card a dock item opens, beside the dock. */
export function DockCard({
  id,
  title,
  children,
  className,
  onPointerEnter,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  onPointerEnter?: () => void;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      onPointerEnter={onPointerEnter}
      className={cn(
        "absolute right-full top-0 mr-2.5 w-72 rounded-xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-right-1 duration-150",
        className,
      )}
    >
      <h2 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A plain clickable row inside a dock card. */
export function DockRow({
  icon,
  label,
  meta,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  meta?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-1.5 flex h-7 w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-md px-1.5 text-left text-[13px] text-foreground/85 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden className="flex w-3.5 shrink-0 justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{meta}</span>}
    </button>
  );
}
