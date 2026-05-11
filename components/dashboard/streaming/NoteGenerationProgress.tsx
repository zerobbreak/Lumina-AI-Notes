"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, Sparkles, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamingPhase } from "@/types/streaming";

interface NoteGenerationProgressProps {
  progress: number;
  phase: StreamingPhase;
}

const STAGE_COPY: Record<
  Exclude<StreamingPhase, "idle" | "error">,
  { title: string; hint: string; icon: typeof Sparkles }
> = {
  generating: {
    title: "Generating",
    hint: "Calling the model and drafting your notes…",
    icon: Sparkles,
  },
  animating: {
    title: "Formatting",
    hint: "Rendering and revealing your notes…",
    icon: FileText,
  },
  complete: {
    title: "Complete",
    hint: "All set — review or insert below.",
    icon: CheckCircle,
  },
};

const stageTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function NoteGenerationProgress({
  progress,
  phase,
}: NoteGenerationProgressProps) {
  if (phase === "idle") return null;

  if (phase === "error") {
    return (
      <div className="space-y-3">
        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-red-500/60"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-medium text-red-400">Something went wrong</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Generation failed. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { title, hint, icon: StageIcon } = STAGE_COPY[phase];
  const showSpinner = phase === "generating" || phase === "animating";

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-cyan-500 to-indigo-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
        {phase === "generating" && (
          <motion.div
            className="absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-white/20 to-transparent"
            animate={{ left: ["-20%", "120%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* One stage at a time — replaces in place (no row of all steps) */}
      <div className="relative min-h-13">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={stageTransition}
            className="flex items-start gap-2.5"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                showSpinner && "bg-indigo-500/20 text-indigo-400",
                phase === "complete" && "bg-cyan-500/20 text-cyan-400",
              )}
            >
              {showSpinner ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <StageIcon className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  "text-sm font-semibold tracking-tight",
                  showSpinner && "text-indigo-400",
                  phase === "complete" && "text-cyan-400",
                )}
              >
                {title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {hint}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
