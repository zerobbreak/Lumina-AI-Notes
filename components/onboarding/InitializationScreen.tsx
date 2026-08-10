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
    <div className="relative h-dvh w-full text-zinc-100 flex flex-col items-center justify-center p-6">
      <OnboardingBackdrop />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <div className="relative mb-12">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ background: "var(--obs-amber-glow)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.25, 0, 0.25] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: "var(--obs-teal-glow)" }}
          />

          <div
            className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-white/[0.12] bg-zinc-950/80 backdrop-blur-sm"
            style={{ boxShadow: "0 0 60px -10px var(--obs-amber-glow)" }}
          >
            <Sparkles className="h-11 w-11" style={{ color: "var(--obs-amber)" }} strokeWidth={1.25} />
          </div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-semibold text-center text-white tracking-tight mb-8"
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
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        className="h-4 w-4 shrink-0 rounded-full border-2"
        style={{ borderColor: "rgba(63,171,156,0.35)", borderTopColor: "var(--obs-teal)" }}
      />
      <span className="text-sm text-zinc-400">{label}</span>
    </motion.div>
  );
}
