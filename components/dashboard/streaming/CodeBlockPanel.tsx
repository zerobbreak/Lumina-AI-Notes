"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, ChevronDown, ChevronUp, Copy, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import type { CodeBlock } from "@/types/streaming";

interface CodeBlockPanelProps {
  codeBlocks: CodeBlock[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CodeBlockPanel({
  codeBlocks,
  onRemove,
  onClear,
}: CodeBlockPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (codeBlocks.length === 0) return null;

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-emerald-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            Code Blocks
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
            {codeBlocks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {codeBlocks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="h-5 px-1.5 text-[10px] text-gray-500 hover:text-red-400"
            >
              Clear all
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Blocks list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ScrollArea className="max-h-[200px]">
              <div className="px-3 pb-3 space-y-2">
                {codeBlocks.map((block, index) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="rounded-md bg-black/40 border border-white/5 overflow-hidden"
                  >
                    {/* Block header */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {block.language}
                        </span>
                        {block.label && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" />
                            {block.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleCopy(block.content)}
                          className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                          title="Copy code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onRemove(block.id)}
                          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                          title="Remove block"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* Code preview */}
                    <pre className="p-2 text-[10px] text-gray-400 font-mono leading-relaxed overflow-x-auto max-h-[60px]">
                      <code>
                        {block.content.length > 120
                          ? block.content.slice(0, 120) + "..."
                          : block.content}
                      </code>
                    </pre>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
