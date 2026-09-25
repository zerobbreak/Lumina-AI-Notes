"use client";

import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersistedDisclosure } from "./usePersistedDisclosure";

interface SidebarSectionProps {
  /** Stable key for the persisted open state. */
  id: string;
  label: string;
  children: ReactNode;
  /** Right-aligned control, e.g. a create button. */
  action?: ReactNode;
  /** Shown in place of the children when the group has nothing in it. */
  emptyLabel?: string;
  isEmpty?: boolean;
  /** Shown beside a closed header, so it still says what's inside. */
  count?: number;
  defaultOpen?: boolean;
  /** Anchor for the product tour (see lib/tour/tours.ts). */
  tourId?: string;
}

/**
 * A collapsible group. The label sits on the rows' icon column; the chevron,
 * count and action sit on the right, so the left edge stays one straight line.
 */
export function SidebarSection({
  id,
  label,
  children,
  action,
  emptyLabel,
  isEmpty = false,
  count,
  defaultOpen = true,
  tourId,
}: SidebarSectionProps) {
  const { isOpen, toggle } = usePersistedDisclosure(`section.${id}`, defaultOpen);
  const contentId = `sidebar-section-${id}`;

  return (
    <div className="min-w-0" data-tour={tourId}>
      {/* An empty section keeps its action visible: it's the obvious next step. */}
      <div className={cn("group/section flex h-6 items-center", isEmpty && "is-empty")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
        >
          <span className="flex-1 select-none truncate text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/80">
            {label}
          </span>
          {!isOpen && count !== undefined && count > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground/70">{count}</span>
          )}
          <ChevronRight
            aria-hidden
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground/55 transition-transform duration-150",
              isOpen && "rotate-90",
            )}
          />
        </button>
        {action}
      </div>

      {isOpen && (
        <div id={contentId} className="mt-0.5 space-y-px">
          {isEmpty && emptyLabel ? (
            <p className="px-2 py-1 text-[12px] text-muted-foreground/70">{emptyLabel}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarSectionActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * A section header's create/upload control. Hover-revealed, except in an empty
 * section (see `is-empty` above) and on touch screens, where it always shows.
 */
export function SidebarSectionAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: SidebarSectionActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition-opacity hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/section:opacity-100 group-[.is-empty]/section:opacity-100 disabled:opacity-40 [@media(hover:none)]:opacity-100"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}
