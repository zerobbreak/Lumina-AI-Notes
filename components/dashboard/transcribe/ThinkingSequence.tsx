"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  THINKING_STAGES,
  THINKING_STAGE_MS,
  thinkingStageIndex,
} from "./pillPhases";

const DOT_COUNT = 5;

/**
 * The pill's "thinking" state: a travelling fade across a row of dots, paired
 * with stage captions that cross-fade as the work progresses.
 *
 * The dots run on CSS keyframes with a per-dot delay rather than a JS timer, so
 * the loop costs nothing on the main thread while notes generate. Both layers
 * inherit `currentColor` so the parent owns the phase colour.
 */
export function ThinkingSequence({
  className,
  stages = THINKING_STAGES,
}: {
  className?: string;
  stages?: readonly string[];
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setStage(thinkingStageIndex(Date.now() - startedAt, stages.length));
    }, 300);
    return () => window.clearInterval(id);
  }, [stages]);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex items-center gap-[3px]" aria-hidden>
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <span
            key={i}
            className="animate-thinking-fade h-[3px] w-[3px] rounded-full bg-current"
            style={{
              animationDelay: `${i * 110}ms`,
            }}
          />
        ))}
      </div>

      <div className="relative h-4 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 block truncate text-xs text-current/80"
          >
            {stages[stage]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* One polite announcement per stage rather than a live-updating meter. */}
      <span className="sr-only" role="status">
        {stages[stage]}
      </span>
    </div>
  );
}

export { THINKING_STAGE_MS };
