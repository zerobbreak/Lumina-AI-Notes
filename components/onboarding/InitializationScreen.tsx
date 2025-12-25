"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function InitializationScreen() {
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />

      <div className="flex flex-col items-center justify-center space-y-8 relative z-10">
        <div className="relative">
          {/* Pulsing rings */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl"
          />
          <motion.div
            animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl"
          />

          <div className="relative z-10 w-24 h-24 bg-black rounded-full border border-indigo-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
        </div>

        <div className="space-y-4 max-w-md mx-auto">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-purple-400">
            Tuning Gemini to your Academic DNA...
          </h2>

          <div className="space-y-2">
            <LoadingStep label="Analyzing Major Requirements..." delay={0} />
            <LoadingStep label="Building Vocabulary Glossary..." delay={1.5} />
            <LoadingStep label="Configuring Note Templates..." delay={3} />
            <LoadingStep label="Setting up Vector Database..." delay={4.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingStep({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-center gap-3 text-sm text-gray-400"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full"
      />
      {label}
    </motion.div>
  );
}
