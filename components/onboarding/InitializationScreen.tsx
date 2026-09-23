"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { OnboardingBackdrop } from "@/components/onboarding/OnboardingChrome";

const STEPS = [
  "Saving your profile…",
  "Linking course files…",
  "Applying workspace theme…",
  "Opening your dashboard…",
] as const;

export function InitializationScreen() {
  return (
    <div className="relative min-h-screen w-full text-foreground flex flex-col items-center justify-center p-6">
      <OnboardingBackdrop />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <div className="relative mb-12">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
          />
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.25, 0, 0.25] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="absolute inset-0 rounded-full bg-primary/20 blur-3xl"
          />

          <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-foreground/[0.12] bg-background/80 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5)] backdrop-blur-sm">
            <Sparkles className="h-11 w-11 text-primary" strokeWidth={1.25} />
          </div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-semibold text-center text-foreground tracking-tight mb-8"
        >
          Setting up Lumina
        </motion.h2>

        <div className="w-full space-y-3">
          {STEPS.map((label, i) => (
            <LoadingStep key={label} label={label} delay={i * 0.35} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingStep({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] px-4 py-3"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        className="h-4 w-4 shrink-0 rounded-full border-2 border-primary/40 border-t-indigo-300"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </motion.div>
  );
}
