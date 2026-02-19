"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle, Sparkles, FileText } from "lucide-react";
import type { StreamingPhase } from "@/types/streaming";

interface NoteGenerationProgressProps {
  progress: number;
  phase: StreamingPhase;
}

const STEPS: {
  phase: StreamingPhase[];
  label: string;
  icon: React.ElementType;
}[] = [
  { phase: ["generating"], label: "Generating", icon: Sparkles },
  { phase: ["animating"], label: "Formatting", icon: FileText },
  { phase: ["complete"], label: "Complete", icon: CheckCircle },
];

function getActiveStepIndex(phase: StreamingPhase): number {
  if (phase === "generating") return 0;
  if (phase === "animating") return 1;
  if (phase === "complete") return 2;
  return -1;
}

export function NoteGenerationProgress({
  progress,
  phase,
}: NoteGenerationProgressProps) {
  const activeStep = getActiveStepIndex(phase);

  if (phase === "idle") return null;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-cyan-500 to-indigo-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        {phase === "generating" && (
          <motion.div
            className="absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-white/20 to-transparent"
            animate={{ left: ["-20%", "120%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep || phase === "complete";
          const Icon = step.icon;

          return (
            <div key={step.label} className="flex items-center gap-1.5">
              <div
                className={`
                  flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300
                  ${isComplete ? "bg-cyan-500/20 text-cyan-400" : ""}
                  ${isActive ? "bg-indigo-500/20 text-indigo-400" : ""}
                  ${!isActive && !isComplete ? "bg-white/5 text-gray-600" : ""}
                `}
              >
                {isActive && phase !== "complete" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-indigo-400"
                    : isComplete
                      ? "text-cyan-400"
                      : "text-gray-600"
                }`}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px mx-1 transition-colors duration-300 ${
                    index < activeStep ? "bg-cyan-500/50" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase-specific message */}
      {phase === "error" && (
        <p className="text-xs text-red-400">
          Generation failed. Please try again.
        </p>
      )}
    </div>
  );
}
