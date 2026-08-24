import "./paper.css";
import type { CSSProperties, ReactNode } from "react";
import { editorial, plexSans, plexMono } from "@/lib/paperFonts";

/**
 * The editorial paper surface: warm ground, ink hairlines, vermilion accent.
 * Wraps every signed-out page (landing, sign-in, sign-up, 404) so they share
 * one set of tokens and one type system. The dark app shell does not use it.
 */
export function PaperSurface({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`lumina-paper ${editorial.variable} ${plexSans.variable} ${plexMono.variable} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
