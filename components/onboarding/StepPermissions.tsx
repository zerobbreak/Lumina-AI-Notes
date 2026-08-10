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
    <div className="flex flex-col items-center text-center flex-1 justify-center gap-6 py-2">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div
          className="absolute inset-0 rounded-full blur-2xl scale-150"
          style={{ background: granted ? "rgba(52,211,153,0.25)" : "var(--obs-amber-glow)" }}
        />
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full ring-1 transition-colors duration-300 ${
            granted
              ? "bg-emerald-500/15 ring-emerald-500/40"
              : ""
          }`}
          style={!granted ? { background: "rgba(204,154,76,0.15)", boxShadow: "inset 0 0 0 1px rgba(204,154,76,0.3)" } : undefined}
        >
          {granted ? (
            <CheckCircle2 className="h-10 w-10 text-emerald-400" strokeWidth={1.5} />
          ) : (
            <Mic className="h-10 w-10" style={{ color: "var(--obs-amber)" }} strokeWidth={1.5} />
          )}
        </div>
      </motion.div>

      <div className="space-y-2 max-w-sm mx-auto">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Used when you record or transcribe lectures. You can change this anytime
          in your browser settings.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-white/8 bg-zinc-900/50 p-4 flex gap-3 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 ring-1 ring-white/6">
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
        className="w-full max-w-sm h-12 rounded-xl text-black font-semibold border border-white/10 shadow-lg hover:brightness-110 transition-[filter]"
        style={{ background: "linear-gradient(135deg, var(--obs-amber), var(--obs-teal))", boxShadow: "0 10px 24px -8px var(--obs-amber-glow)" }}
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
