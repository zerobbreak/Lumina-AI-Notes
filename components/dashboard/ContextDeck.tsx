"use client";

import { useDashboard } from "@/hooks/useDashboard";
import { X, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ContextDeck = () => {
  const { activeContext, setActiveContext } = useDashboard();

  if (!activeContext) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="w-full mb-4"
      >
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-300 uppercase tracking-wider mb-0.5">
              Context Active
            </p>
            <p className="text-sm text-white font-medium truncate">
              {activeContext.name}
            </p>
          </div>

          <button
            onClick={() => setActiveContext(null)}
            className="relative z-10 w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Beam effect */}
          <div className="absolute -top-10 -left-10 w-20 h-40 bg-blue-500/20 rotate-45 blur-xl pointer-events-none animate-pulse" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
