"use client";

import { useDocumentProcessor } from "@/components/documents";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Document Processing Indicator
 * Shows a toast when documents are being processed
 */
export function DocumentProcessingIndicator() {
  const { pendingCount, isProcessing } = useDocumentProcessor();

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 bg-[#1a1a1f] border border-white/10 rounded-xl p-4 shadow-2xl flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              Processing Documents
            </p>
            <p className="text-gray-400 text-xs">
              {pendingCount} file{pendingCount > 1 ? "s" : ""} remaining
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
