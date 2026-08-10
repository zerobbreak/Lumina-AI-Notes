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
    <div className="w-full max-w-lg mx-auto mb-5 shrink-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div
              key={label}
              className="flex flex-1 flex-col items-center gap-1.5 min-w-0"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.05 : 1,
                  opacity: done || active ? 1 : 0.35,
                }}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done &&
                    "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40",
                  active && !done && "text-black",
                  !done &&
                    !active &&
                    "bg-white/[0.06] text-zinc-500 ring-1 ring-white/10",
                )}
                style={
                  active && !done
                    ? {
                        background: "var(--obs-amber)",
                        boxShadow: "0 0 20px var(--obs-amber-glow)",
                      }
                    : undefined
                }
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
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--obs-teal), var(--obs-amber))",
            boxShadow: "0 0 12px var(--obs-amber-glow)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${(step / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Step {step} of {total}
      </p>
    </div>
  );
}

export function OnboardingBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "var(--obs-bg)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -20%, var(--obs-amber-glow), transparent 50%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 100% 100%, var(--obs-teal-glow), transparent 45%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]"
        aria-hidden
      />
    </>
  );
}
