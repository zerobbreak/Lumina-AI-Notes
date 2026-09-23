"use client";

import { useEffect, useState } from "react";

/**
 * Bumps whenever the theme attributes on <html> change (dark class, accent),
 * so canvas renderers that resolve CSS variables in JS know to redraw.
 */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    return () => observer.disconnect();
  }, []);

  return version;
}

/** Resolves an HSL-triplet token like `--primary` to a canvas-usable colour. */
export function readThemeColor(el: Element, token: string, alpha = 1): string {
  const value = getComputedStyle(el).getPropertyValue(token).trim();
  return value ? `hsl(${value} / ${alpha})` : `rgba(128, 128, 128, ${alpha})`;
}
