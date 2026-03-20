"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Welcome", "Focus", "Courses", "Audio"] as const;

export function OnboardingProgress({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <div className="w-full max-w-lg mx-auto mb-10">
      <div className="flex items-center justify-between gap-2 mb-4">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div
              key={label}
              className="flex flex-1 flex-col items-center gap-2 min-w-0"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.05 : 1,
                  opacity: done || active ? 1 : 0.35,
                }}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done &&
                    "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40",
                  active &&
                    !done &&
                    "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.45)]",
                  !done &&
                    !active &&
                    "bg-white/[0.06] text-zinc-500 ring-1 ring-white/10",
                )}
              >
                {done ? "✓" : n}
              </motion.div>
              <span
                className={cn(
                  "hidden sm:block text-[10px] font-medium uppercase tracking-widest truncate max-w-full text-center",
                  active ? "text-zinc-200" : "text-zinc-600",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden ring-1 ring-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
          initial={{ width: 0 }}
          animate={{ width: `${(step / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        Step {step} of {total}
      </p>
    </div>
  );
}

export function OnboardingBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 bg-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.22),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(168,85,247,0.12),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(59,130,246,0.08),transparent_40%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]"
        aria-hidden
      />
    </>
  );
}
