"use client";

import { useState, useEffect } from "react";
import { Monitor, X } from "lucide-react";

export function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Check screen width (tablets usually < 1024px, phones < 768px)
      const isMobileWidth = window.innerWidth < 1024;

      // Also check for touch capability as additional signal
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Consider mobile if small screen OR touch-only device with small screen
      setIsMobile(isMobileWidth);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md text-center shadow-2xl">
        <div className="w-16 h-16 bg-linear-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Monitor className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Desktop Experience Recommended
        </h2>

        <p className="text-zinc-400 mb-6 leading-relaxed">
          Lumina Notes is optimized for desktop browsers. For the best
          experience with our rich editor, diagrams, and AI features, please
          visit on a laptop or desktop computer.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setDismissed(true)}
            className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
          >
            Continue Anyway
          </button>
        </div>

        <p className="text-zinc-600 text-xs mt-4">
          Screen width: {typeof window !== "undefined" ? window.innerWidth : 0}
          px
        </p>
      </div>
    </div>
  );
}
