"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Welcome", "Focus", "Modules", "Audio"] as const;

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
                    "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.45)]",
                  !done &&
                    !active &&
                    "bg-foreground/[0.06] text-muted-foreground/80 ring-1 ring-foreground/10",
                )}
              >
                {done ? "✓" : n}
              </motion.div>
              <span
                className={cn(
                  "hidden sm:block text-[10px] font-medium uppercase tracking-widest truncate max-w-full text-center",
                  active ? "text-foreground/90" : "text-muted-foreground/60",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 rounded-full bg-foreground/[0.06] overflow-hidden ring-1 ring-foreground/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary via-primary-alt to-fuchsia-500 shadow-[0_0_12px_hsl(var(--chart-2)/0.4)]"
          initial={{ width: 0 }}
          animate={{ width: `${(step / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground/80">
        Step {step} of {total}
      </p>
    </div>
  );
}

export function OnboardingBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 bg-background"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.22),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,hsl(var(--chart-2)/0.12),transparent_45%)]"
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
