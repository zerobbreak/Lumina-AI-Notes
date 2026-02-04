"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  selector?: string;
};

interface TourOverlayProps {
  steps: TourStep[];
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

export function TourOverlay({ steps, open, onComplete, onSkip }: TourOverlayProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];

  const updateRect = () => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  };

  useEffect(() => {
    if (!open) return;
    updateRect();
    const handleResize = () => updateRect();
    const handleScroll = () => updateRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const tooltipStyle = useMemo(() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
    }
    const padding = 16;
    const top = rect.top + rect.height + 12;
    const left = Math.min(
      Math.max(rect.left, padding),
      window.innerWidth - 340,
    );
    const finalTop =
      top + 220 > window.innerHeight
        ? rect.top - 220
        : top;
    return {
      top: Math.max(padding, finalTop),
      left,
    } as const;
  }, [rect]);

  if (!open || steps.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/70" />

      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-200"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div
        className="absolute w-[320px] bg-[#0b0b12] text-white border border-white/10 rounded-xl p-4 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">
            Step {index + 1} of {steps.length}
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-sm font-semibold">{step.title}</div>
        <div className="mt-1 text-xs text-gray-400">{step.description}</div>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            onClick={onSkip}
          >
            Skip
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (index === steps.length - 1) {
                  onComplete();
                } else {
                  setIndex((i) => i + 1);
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {index === steps.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
