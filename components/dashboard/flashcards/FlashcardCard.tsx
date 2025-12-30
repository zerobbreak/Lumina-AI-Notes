"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlashcardCardProps {
  front: string;
  back: string;
  isFlipped?: boolean;
  onFlip?: () => void;
  className?: string;
}

export function FlashcardCard({
  front,
  back,
  isFlipped: controlledFlipped,
  onFlip,
  className,
}: FlashcardCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);

  // Support both controlled and uncontrolled modes
  const isFlipped = controlledFlipped ?? internalFlipped;

  const handleFlip = () => {
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlipped(!internalFlipped);
    }
  };

  return (
    <div
      className={cn(
        "relative w-full max-w-xl aspect-3/2 cursor-pointer perspective-1000",
        className
      )}
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front Side */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-2xl",
            "bg-linear-to-br from-indigo-600/20 to-purple-600/20",
            "border border-white/10 backdrop-blur-xl",
            "flex flex-col items-center justify-center p-8",
            "shadow-2xl shadow-indigo-500/10"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-xs text-indigo-400 uppercase tracking-wider mb-4 font-semibold">
            Question
          </span>
          <p className="text-xl md:text-2xl text-white text-center font-medium leading-relaxed">
            {front}
          </p>
          <span className="absolute bottom-4 text-xs text-gray-500">
            Click to reveal answer
          </span>
        </div>

        {/* Back Side */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-2xl",
            "bg-linear-to-br from-cyan-600/20 to-emerald-600/20",
            "border border-white/10 backdrop-blur-xl",
            "flex flex-col items-center justify-center p-8",
            "shadow-2xl shadow-cyan-500/10"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-xs text-cyan-400 uppercase tracking-wider mb-4 font-semibold">
            Answer
          </span>
          <p className="text-xl md:text-2xl text-white text-center font-medium leading-relaxed">
            {back}
          </p>
          <span className="absolute bottom-4 text-xs text-gray-500">
            Click to flip back
          </span>
        </div>
      </motion.div>
    </div>
  );
}
