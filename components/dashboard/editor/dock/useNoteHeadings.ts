"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NoteHeading = { text: string; level: 1 | 2 | 3 };

/** How far below the top of the scroller a heading counts as "current". */
const ACTIVE_OFFSET = 96;

/**
 * The headings inside `#rootId` (either editor), kept current as the note is
 * edited, plus which one the reader is in. Reads the DOM rather than the
 * editor model, so the TipTap editor and the outline editor both work.
 */
export function useNoteHeadings(rootId: string, resetKey: string) {
  const [headings, setHeadings] = useState<NoteHeading[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const elements = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const scroller = root.closest<HTMLElement>("[data-radix-scroll-area-viewport]");

    const updateActive = () => {
      const top = (scroller?.getBoundingClientRect().top ?? 0) + ACTIVE_OFFSET;
      let current = 0;
      elements.current.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= top) current = i;
      });
      setActiveIndex(current);
    };

    let frame = 0;
    const collect = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const els = Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3")).filter(
          (el) => el.textContent?.trim(),
        );
        elements.current = els;
        const next = els.map((el) => ({
          text: el.textContent!.trim(),
          level: Number(el.tagName[1]) as 1 | 2 | 3,
        }));
        // Only re-render when the outline itself changed, not on every keystroke.
        setHeadings((prev) =>
          prev.length === next.length &&
          prev.every((h, i) => h.text === next[i]!.text && h.level === next[i]!.level)
            ? prev
            : next,
        );
        updateActive();
      });
    };

    collect();
    const observer = new MutationObserver(collect);
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    scroller?.addEventListener("scroll", updateActive, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller?.removeEventListener("scroll", updateActive);
    };
  }, [rootId, resetKey]);

  const scrollTo = useCallback((index: number) => {
    // Honour the app's reduced-motion setting, which lives on <html>.
    const reduce = document.documentElement.dataset.motion === "reduce";
    elements.current[index]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  return { headings, activeIndex, scrollTo };
}
