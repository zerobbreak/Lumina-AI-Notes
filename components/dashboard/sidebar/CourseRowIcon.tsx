"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  getCourseIcon,
  getCourseInitials,
  shouldUseCourseInitials,
} from "@/lib/courseDisplay";

interface CourseRowIconProps {
  name: string;
  code: string;
  isActive?: boolean;
  className?: string;
}

function CourseRowIconComponent({
  name,
  code,
  isActive = false,
  className,
}: CourseRowIconProps) {
  const useInitials = shouldUseCourseInitials(code);
  const Icon = getCourseIcon(code);

  return (
    <div
      aria-hidden
      className={cn(
        "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded border",
        isActive
          ? "border-sidebar-border/80 bg-sidebar-accent/60"
          : "border-sidebar-border/50 bg-sidebar-accent/25",
        className,
      )}
    >
      {useInitials ? (
        <span className="text-[8px] font-semibold leading-none text-muted-foreground/80">
          {getCourseInitials(name)}
        </span>
      ) : (
        <Icon
          className={cn(
            "h-2.5 w-2.5",
            isActive ? "text-sidebar-foreground/90" : "text-muted-foreground/70",
          )}
        />
      )}
    </div>
  );
}

export const CourseRowIcon = memo(CourseRowIconComponent);
