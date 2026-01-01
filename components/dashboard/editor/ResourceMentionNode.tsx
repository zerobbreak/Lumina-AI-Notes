"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChipChat } from "./ChipChat";
import { Id } from "@/convex/_generated/dataModel";

export function ResourceMentionNode({ node, editor }: NodeViewProps) {
  const { id, label } = node.attrs as { id: string; label: string };

  const handleCopyToNote = (content: string) => {
    if (editor) {
      // Insert the content at the current selection or at the end
      editor.chain().focus().insertContent(`<p>${content}</p>`).run();
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className="inline"
      contentEditable={false}
      draggable={false}
    >
      <Popover modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-medium inline-flex items-center gap-1 cursor-pointer select-none mx-1 align-middle hover:bg-indigo-500/30 transition-colors"
            contentEditable={false}
          >
            <span className="opacity-75">📄</span>
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-auto p-4"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ChipChat
            fileId={id as Id<"files">}
            fileName={label}
            onCopyToNote={handleCopyToNote}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
