"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { SidebarRow } from "./SidebarRow";

interface SidebarNavItemProps {
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  /** Icon-only presentation for the 60px rail. */
  isRail?: boolean;
  onClick: () => void;
  /** Called when the row is hovered or focused, ahead of a likely click. */
  onPrefetch?: () => void;
}

/** A fixed destination row (Home, Studio, …). */
function SidebarNavItemComponent({
  label,
  icon: Icon,
  isActive = false,
  isRail = false,
  onClick,
  onPrefetch,
}: SidebarNavItemProps) {
  return (
    <SidebarRow
      label={label}
      icon={<Icon className={isRail ? "h-[15px] w-[15px]" : "h-[14px] w-[14px]"} />}
      isActive={isActive}
      isRail={isRail}
      onClick={onClick}
      onPrefetch={onPrefetch}
    />
  );
}

export const SidebarNavItem = memo(SidebarNavItemComponent);
