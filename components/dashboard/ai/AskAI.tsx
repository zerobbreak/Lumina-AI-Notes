"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { useDashboard } from "@/hooks/useDashboard";

interface AskAIProps {
  context?: string;
  contextType?: "note" | "transcript" | "general";
  contextTitle?: string;
}

export function AskAI({
  context,
  contextType = "general",
  contextTitle,
}: AskAIProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { isRightSidebarOpen } = useDashboard();

  return (
    <>
      {/* Floating AI Widget Container */}
      <div
        className={`fixed bottom-6 z-40 flex flex-col items-end gap-4 transition-all duration-300 ease-in-out ${
          isRightSidebarOpen ? "right-[340px]" : "right-6"
        }`}
      >
        <AIAssistantPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          context={context}
          contextType={contextType}
          contextTitle={contextTitle}
        />

        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`group flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-r from-purple-600 to-violet-600 text-white shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 transition-all duration-300 ${
            isPanelOpen ? "ring-2 ring-white/20 rotate-90" : ""
          }`}
        >
          {isPanelOpen ? (
            <Sparkles className="w-6 h-6" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  );
}
