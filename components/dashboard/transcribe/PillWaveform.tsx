"use client";

import { cn } from "@/lib/utils";

/**
 * Symmetric bar meter for the pill.
 *
 * Bars are driven by real analyser levels (not randomness), mirrored around the
 * centre so the shape reads as a physical VU meter. `currentColor` throughout
 * lets the parent recolour the whole meter per phase — and keeps it correct in
 * light, dark, and system themes without a second palette.
 */
export function PillWaveform({
  levels,
  active,
  className,
  barClassName,
}: {
  levels: number[];
  /** Live audio: bars track input. Otherwise they settle to a calm resting line. */
  active: boolean;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div
      className={cn("flex h-6 items-center justify-center gap-[3px]", className)}
      aria-hidden
    >
      {levels.map((level, i) => {
        const height = active ? 3 + level * 21 : 3 + level * 9;
        return (
          <span
            key={i}
            className={cn(
              "w-[2.5px] rounded-full bg-current",
              // Transitioning height (not transform) keeps the rounded caps
              // crisp; 90ms is short enough to feel live, long enough to
              // smooth analyser jitter between sampled frames.
              "transition-[height,opacity] duration-90 ease-out motion-reduce:transition-none",
              barClassName,
            )}
            style={{
              height: `${height}px`,
              opacity: active ? 0.45 + level * 0.55 : 0.24 + level * 0.2,
            }}
          />
        );
      })}
    </div>
  );
}
