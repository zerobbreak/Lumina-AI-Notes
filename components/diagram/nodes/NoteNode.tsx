"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteNodeData {
  label?: string;
  color?: string;
  onLabelChange?: (label: string) => void;
  noteId?: string;
  isCenter?: boolean;
  onOpenNote?: (id: string) => void;
}

export const NoteNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NoteNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label || "Note");
  const inputRef = useRef<HTMLDivElement>(null);

  const graphNote = Boolean(nodeData.noteId);
  const canEditLabelInline = !graphNote;

  const handleDoubleClick = useCallback(() => {
    if (!canEditLabelInline) return;
    setIsEditing(true);
  }, [canEditLabelInline]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (nodeData.onLabelChange) {
      nodeData.onLabelChange(label);
    }
  }, [label, nodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setIsEditing(false);
        if (nodeData.onLabelChange) {
          nodeData.onLabelChange(label);
        }
      }
    },
    [label, nodeData],
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const bgColor =
    nodeData.color || "bg-gradient-to-br from-amber-400 to-orange-400";

  return (
    <div
      className={cn(
        `px-3 py-2 rounded-md shadow-sm border min-w-[80px] transition-all duration-200 hover:scale-105`,
        selected ? "border-cyan-400" : "border-white/20",
        bgColor,
        graphNote ? "cursor-pointer" : "",
        nodeData.isCenter &&
          "ring-2 ring-cyan-400/90 ring-offset-2 ring-offset-slate-950",
      )}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        if (!nodeData.noteId || !nodeData.onOpenNote) return;
        e.stopPropagation();
        nodeData.onOpenNote(nodeData.noteId);
      }}
      role={nodeData.onOpenNote && nodeData.noteId ? "button" : undefined}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-1.5 h-1.5 bg-white!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-1.5 h-1.5 bg-white!"
      />

      <div className="flex items-center gap-1">
        <StickyNote className="w-3 h-3 text-white shrink-0" />
        {isEditing ? (
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={(e) => setLabel(e.currentTarget.textContent || "")}
            className="text-white text-xs outline-none bg-white/10 px-1 py-0.5 rounded"
          >
            {label}
          </div>
        ) : (
          <div className="text-white text-xs line-clamp-2">{label}</div>
        )}
      </div>
    </div>
  );
});

NoteNode.displayName = "NoteNode";
