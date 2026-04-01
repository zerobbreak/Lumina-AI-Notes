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

const PREVIEW_LEN = 120;

export function CodeBlockPanel({
  codeBlocks,
  onRemove,
  onClear,
}: CodeBlockPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleBlockExpand = (id: string) => {
    setExpandedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      {/* Header — outer wrapper is a div so "Clear all" is not nested inside the expand toggle */}
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-emerald-500/10 transition-colors">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Code2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Code Blocks</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
            {codeBlocks.length}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {codeBlocks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-5 px-1.5 text-[10px] text-gray-500 hover:text-red-400"
            >
              Clear all
            </Button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-0.5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse code blocks" : "Expand code blocks"}
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

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
                {codeBlocks.map((block) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="rounded-md bg-[#0d1117] border border-white/10 overflow-hidden"
                  >
                    {/* Block header */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                          {block.language}
                        </span>
                        {block.label && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate">
                            <Tag className="w-2.5 h-2.5 shrink-0" />
                            {block.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {block.content.length > PREVIEW_LEN && (
                          <button
                            type="button"
                            onClick={() => toggleBlockExpand(block.id)}
                            className="px-1.5 py-0.5 text-[10px] text-emerald-400/90 hover:text-emerald-300 rounded transition-colors"
                          >
                            {expandedBlockIds.has(block.id)
                              ? "Collapse"
                              : "Expand"}
                          </button>
                        )}
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
                    {/* Full code block body (Notion-like); collapsed shows a short preview */}
                    <pre
                      className={`p-3 text-[11px] text-gray-200 font-mono leading-relaxed overflow-x-auto whitespace-pre border-t border-white/5 ${
                        expandedBlockIds.has(block.id)
                          ? "max-h-[min(360px,70vh)] overflow-y-auto"
                          : "max-h-[72px] overflow-hidden"
                      }`}
                    >
                      <code className="block w-full min-w-0">
                        {expandedBlockIds.has(block.id) ||
                        block.content.length <= PREVIEW_LEN
                          ? block.content
                          : block.content.slice(0, PREVIEW_LEN) + "…"}
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
