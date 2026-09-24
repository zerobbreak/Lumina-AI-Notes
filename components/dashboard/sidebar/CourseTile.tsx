"use client";

import { createElement, memo } from "react";
import { ACCENT_INFO } from "@/lib/appearance/catalog";
import type { AccentSwatch } from "@/lib/appearance/model";
import {
  getCourseIcon,
  getCourseInitials,
  shouldUseCourseInitials,
} from "@/lib/courseDisplay";
import { cn } from "@/lib/utils";

interface CourseTileProps {
  name: string;
  code: string;
  color?: AccentSwatch;
  /** 16px in a row's 14px icon slot; 18px on the rail. */
  size?: "row" | "rail";
}

/**
 * A course's icon on a tile tinted with the course colour, so the colour and
 * the icon are one mark instead of a tile plus a separate dot.
 */
function CourseTileComponent({ name, code, color, size = "row" }: CourseTileProps) {
  const swatch = ACCENT_INFO.find((a) => a.id === color)?.swatch;
  const glyph = shouldUseCourseInitials(code) ? (
    <span className="text-[8px] font-bold leading-none">{getCourseInitials(name)}</span>
  ) : (
    createElement(getCourseIcon(code), {
      className: size === "rail" ? "h-3 w-3" : "h-2.5 w-2.5",
      strokeWidth: 2.25,
    })
  );

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded",
        size === "rail" ? "h-[18px] w-[18px]" : "-m-px h-4 w-4",
        !swatch && "bg-sidebar-accent text-sidebar-foreground/80",
      )}
      style={
        swatch
          ? { background: `hsl(${swatch} / 0.18)`, color: `hsl(${swatch})` }
          : undefined
      }
    >
      {glyph}
    </span>
  );
}

export const CourseTile = memo(CourseTileComponent);
