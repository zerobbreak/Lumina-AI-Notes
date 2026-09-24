"use client";

import { ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Every row in the sidebar is this one component, so they all share one grid:
 * 28px tall, the icon at 8px inside the row and the label 10px after it. With
 * the panel's 8px gutter that puts every icon at x=16 and every label at x=40.
 */

interface SidebarRowProps {
  label: ReactNode;
  /** A 14px glyph, or a tile the same size (see CourseTile). */
  icon?: ReactNode;
  isActive?: boolean;
  /** Quieter text, for secondary rows like "Add module" or "Show all". */
  isMuted?: boolean;
  onClick?: () => void;
  /** Right-aligned detail, e.g. a count. Gives way to `actions` on hover. */
  meta?: ReactNode;
  /** Controls revealed on hover or keyboard focus, e.g. an ActionMenu. */
  actions?: ReactNode;
  /** Turns the icon slot into an expand toggle on hover. */
  disclosure?: { isOpen: boolean; onToggle: () => void };
  /** Icon-only 32px square for the collapsed rail, labelled by a tooltip. */
  isRail?: boolean;
  /** Something is being dragged over the row and it will accept the drop. */
  isDropTarget?: boolean;
  /** Fetch whatever the click will need, ahead of the click. */
  onPrefetch?: () => void;
  /** Accessible name when `label` isn't plain text. */
  ariaLabel?: string;
  /** Drag-and-drop handlers, put on the whole row. */
  dragProps?: Pick<
    HTMLAttributes<HTMLDivElement>,
    "draggable" | "onDragStart" | "onDragEnd" | "onDragOver" | "onDragLeave" | "onDrop"
  >;
  className?: string;
}

export function SidebarRow({
  label,
  icon,
  isActive = false,
  isMuted = false,
  onClick,
  meta,
  actions,
  disclosure,
  isRail = false,
  isDropTarget = false,
  onPrefetch,
  ariaLabel,
  dragProps,
  className,
}: SidebarRowProps) {
  const accessibleName = ariaLabel ?? (typeof label === "string" ? label : undefined);

  if (isRail) {
    const square = (
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
        aria-label={accessibleName}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          className,
        )}
      >
        {isActive && <ActiveBar className="-left-2" />}
        {icon}
      </button>
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>{square}</TooltipTrigger>
        <TooltipContent side="right">{accessibleName}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      {...dragProps}
      data-active={isActive || undefined}
      className={cn(
        "group/row relative flex h-7 min-w-0 items-center rounded-md text-[13px] transition-colors duration-100",
        isDropTarget
          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
          : isActive
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : cn(
                "hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                isMuted ? "text-muted-foreground" : "text-sidebar-foreground/80",
              ),
        className,
      )}
    >
      {isActive && !isDropTarget && <ActiveBar className="left-0" />}
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
        aria-label={ariaLabel}
        aria-current={isActive ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
      >
        <span
          aria-hidden
          className={cn(
            "flex w-3.5 shrink-0 justify-center transition-opacity",
            isActive || isDropTarget ? "opacity-100" : "opacity-70 group-hover/row:opacity-100",
            disclosure &&
              "group-hover/row:opacity-0 group-focus-within/row:opacity-0 [@media(hover:none)]:opacity-0",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {meta !== undefined && meta !== null && (
          <span
            className={cn(
              "shrink-0 text-[11px] font-normal tabular-nums text-muted-foreground/75",
              actions &&
                "group-hover/row:opacity-0 group-focus-within/row:opacity-0 [@media(hover:none)]:hidden",
            )}
          >
            {meta}
          </span>
        )}
      </button>

      {disclosure && (
        <button
          type="button"
          onClick={disclosure.onToggle}
          aria-expanded={disclosure.isOpen}
          aria-label={disclosure.isOpen ? "Collapse" : "Expand"}
          className="absolute left-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform duration-150", disclosure.isOpen && "rotate-90")}
          />
        </button>
      )}

      {actions && (
        <div className="absolute right-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

function ActiveBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute inset-y-1 w-[2px] rounded-r-full bg-primary", className)}
    />
  );
}

/**
 * One indent step: children sit under a guide line drawn through the parent
 * row's icon centre (8px padding + half of 14px = 15px).
 */
export function SidebarRowGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("ml-[15px] space-y-px border-l border-sidebar-border/60 pl-1.5", className)}>
      {children}
    </div>
  );
}

