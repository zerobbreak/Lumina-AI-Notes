"use client";

import { motion } from "framer-motion";
import { marked } from "marked";
import { useMemo } from "react";
import type { StreamingNotesState } from "@/types/streaming";
import { NoteGenerationProgress } from "./NoteGenerationProgress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Copy, FileInput, X, SkipForward } from "lucide-react";
import { toast } from "sonner";

interface StreamingNotesDisplayProps {
  state: StreamingNotesState;
  onInsert: (markdownContent: string) => void;
  onCancel: () => void;
  onSkip?: () => void;
}

export function StreamingNotesDisplay({
  state,
  onInsert,
  onCancel,
  onSkip,
}: StreamingNotesDisplayProps) {
  // Convert current markdown content to HTML for display
  const htmlContent = useMemo(() => {
    if (!state.content) return "";
    try {
      // marked.parse can return string | Promise<string>, use sync config
      const result = marked.parse(state.content, { async: false });
      return typeof result === "string" ? result : "";
    } catch {
      return state.content;
    }
  }, [state.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.fullContent || state.content);
      toast.success("Notes copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-3"
    >
      {/* Progress indicator */}
      <NoteGenerationProgress progress={state.progress} phase={state.phase} />

      {/* Content area */}
      {state.content && (
        <ScrollArea className="max-h-[400px] rounded-lg border border-white/10 bg-black/30">
          <div className="p-4">
            <div
              className="prose prose-invert prose-sm max-w-none
                prose-headings:text-cyan-300 prose-headings:font-semibold
                prose-strong:text-white prose-em:text-gray-300
                prose-li:text-gray-300 prose-p:text-gray-300
                prose-code:text-emerald-400 prose-code:bg-emerald-900/30 prose-code:px-1 prose-code:rounded
                prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-white/10
                prose-blockquote:border-cyan-500/50 prose-blockquote:text-gray-400"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            {/* Blinking cursor during animation */}
            {state.phase === "animating" && (
              <span className="inline-block w-[2px] h-4 bg-cyan-400 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        </ScrollArea>
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {state.error || "An error occurred while generating notes."}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {state.phase === "complete" && (
          <>
            <Button
              size="sm"
              onClick={() => onInsert(state.fullContent || state.content)}
              className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 flex-1"
            >
              <FileInput className="w-3.5 h-3.5 mr-1.5" />
              Insert into Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="text-gray-400 hover:text-white"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </>
        )}

        {(state.phase === "generating" || state.phase === "animating") && (
          <>
            {state.phase === "animating" && onSkip && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSkip}
                className="text-gray-400 hover:text-white"
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" />
                Skip
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="text-gray-400 hover:text-red-400 ml-auto"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
          </>
        )}

        {state.phase === "error" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            Dismiss
          </Button>
        )}
      </div>
    </motion.div>
  );
}
