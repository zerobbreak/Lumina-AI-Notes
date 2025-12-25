"use client";

import { motion } from "framer-motion";
import { Mic, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
      }, 1000);
    } catch (err) {
      console.error("Permission denied", err);
      alert("Microphone access is required for recording lectures.");
    }
  };

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
          {granted ? (
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          ) : (
            <Mic className="w-10 h-10 text-indigo-400" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">Enable Audio Capture</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Lumina needs microphone access to record and transcribe your lectures
          in real-time.
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-start gap-3 text-left max-w-sm mx-auto">
        <Lock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-200/80">
          Your recordings are processed securely and never used for training
          public models without your consent.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full h-12 text-base"
          onClick={requestMicrophone}
          disabled={granted}
        >
          {granted ? "Access Granted" : "Allow Microphone Access"}
        </Button>
      </div>
    </div>
  );
}
