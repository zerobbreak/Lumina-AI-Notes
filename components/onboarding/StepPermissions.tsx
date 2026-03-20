"use client";

import { motion } from "framer-motion";
import { Mic, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface StepPermissionsProps {
  onPermissionGranted: () => void;
}

export function StepPermissions({ onPermissionGranted }: StepPermissionsProps) {
  const [granted, setGranted] = useState(false);

  const requestMicrophone = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setGranted(true);
      setTimeout(() => {
        onPermissionGranted();
      }, 600);
    } catch (err) {
      console.error("Permission denied", err);
      toast.error("Microphone access is needed for voice capture.", {
        description: "Allow the prompt in your browser, or enable it in site settings.",
      });
    }
  };

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center gap-8 py-2">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full bg-indigo-500/25 blur-2xl scale-150" />
        <div
          className={`relative flex h-24 w-24 items-center justify-center rounded-full ring-1 transition-colors duration-300 ${
            granted
              ? "bg-emerald-500/15 ring-emerald-500/40"
              : "bg-indigo-500/15 ring-indigo-400/30"
          }`}
        >
          {granted ? (
            <CheckCircle2 className="h-11 w-11 text-emerald-400" strokeWidth={1.5} />
          ) : (
            <Mic className="h-11 w-11 text-indigo-300" strokeWidth={1.5} />
          )}
        </div>
      </motion.div>

      <div className="space-y-2 max-w-sm mx-auto">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Used when you record or transcribe lectures. You can change this anytime
          in your browser settings.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 flex gap-3 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 ring-1 ring-white/[0.06]">
          <Shield className="h-4 w-4 text-zinc-400" />
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Audio is processed for your workspace. We don&apos;t use your recordings
          to train public models without your consent.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full max-w-sm h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-white/10 shadow-lg shadow-indigo-500/20"
        onClick={requestMicrophone}
        disabled={granted}
      >
        {granted ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            You&apos;re set
          </span>
        ) : (
          "Allow microphone"
        )}
      </Button>
    </div>
  );
}
