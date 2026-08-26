"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavItemProps {
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  /** Icon-only presentation for the 60px rail. */
  isRail?: boolean;
  onClick: () => void;
}

/**
 * A fixed destination row. The active marker — a filled row plus a bar on the
 * leading edge — is the same treatment used for the open note and the active
 * course, so "you are here" reads the same everywhere in the panel.
 */
function SidebarNavItemComponent({
  label,
  icon: Icon,
  isActive = false,
  isRail = false,
  onClick,
}: SidebarNavItemProps) {
  const row = (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group/nav relative flex w-full items-center gap-2.5 rounded-md text-[13px] transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        isRail ? "h-8 w-8 justify-center px-0" : "h-7 px-2",
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-[2px] rounded-r-full bg-primary"
        />
      )}
      <Icon
        className={cn(
          "h-[14px] w-[14px] shrink-0 transition-opacity",
          isActive
            ? "opacity-100"
            : "opacity-70 group-hover/nav:opacity-100",
        )}
      />
      {!isRail && <span className="truncate">{label}</span>}
    </button>
  );

  if (!isRail) return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export const SidebarNavItem = memo(SidebarNavItemComponent);
