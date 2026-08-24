"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AIAssistantPanel } from "./AIAssistantPanel";

interface AskAIProps {
  context?: string;
  contextType?: "note" | "transcript" | "general";
  contextTitle?: string;
  onInsertToNote?: (content: string) => void;
}

export function AskAI({
  context,
  contextType = "general",
  contextTitle,
  onInsertToNote,
}: AskAIProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      {/* Floating AI Widget Container.
          Capture/transcription now lives in the centred pill rather than a
          right panel, so this no longer offsets for a sidebar width. */}
      <div
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4 transition-all duration-300 ease-in-out"
      >
        <AIAssistantPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          context={context}
          contextType={contextType}
          contextTitle={contextTitle}
          onInsertToNote={onInsertToNote}
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
